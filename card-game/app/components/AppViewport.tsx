"use client";
import React, { useEffect, useState } from "react";
import ViewportScaler from "./ViewportScaler";
import styles from "../assets/css/Game.Master.module.css";
import { logger } from "../lib/logger";

// iOS Safari かどうか（Chrome on iOS や Edge on iOS も含む WebKit ベース全般を判定）
function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad は iOS 13+ で MacIntel を返すため maxTouchPoints で iPad を識別
  const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPod|iPad/.test(ua) || isIPad;
}

// PWA standalone モードで起動されているか
function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari は navigator.standalone を持つ独自実装
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  // 標準（Android Chrome 等）は matchMedia
  const mqStandalone = window.matchMedia?.("(display-mode: standalone)").matches === true;
  return iosStandalone || mqStandalone;
}

export default function AppViewport({ children }: { children: React.ReactNode }) {
  const [showRotateOverlay, setShowRotateOverlay] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  // iOS Safari 通常モードで画面端エッジスワイプ（戻る/進む/タブ切替）を吸収する overlay の表示判定
  const [showEdgeGuard, setShowEdgeGuard] = useState(false);

  useEffect(() => {
    // iOS Safari 通常モード（standalone 起動でない）のときだけ edge guard を有効化
    setShowEdgeGuard(detectIOS() && !detectStandalone());
  }, []);

  // iOS Safari かつ standalone でない場合に一度だけインストール案内
  useEffect(() => {
    if (!detectIOS()) return;
    if (detectStandalone()) return;
    // localStorage で「閉じた」状態を覚える（毎回出るのは煩わしい）
    try {
      if (window.localStorage.getItem("ug_install_hint_dismissed") === "1") return;
    } catch {}
    setShowInstallHint(true);
  }, []);

  // matchMedia で端末の向きを監視（resize より確実で iOS 対応）
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const isTouchLike = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      setShowRotateOverlay(isTouchLike && e.matches);
    };

    handle(mq);

    if (mq.addEventListener) {
      mq.addEventListener("change", handle);
      return () => mq.removeEventListener("change", handle);
    } else {
      // iOS Safari 13 以前
      mq.addListener(handle as (this: MediaQueryList, ev: MediaQueryListEvent) => void);
      return () => mq.removeListener(handle as (this: MediaQueryList, ev: MediaQueryListEvent) => void);
    }
  }, []);

  // 画面ロック試行：Android Chrome はサポート、iOS Safari は常に失敗するが catch で無視する
  const requestFullscreenAndLock = async () => {
    if (typeof window === "undefined") return;
    try {
      if (document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
    try {
      const orientation = screen?.orientation as (ScreenOrientation & { lock?: (type: string) => Promise<void> }) | undefined;
      if (typeof orientation?.lock === "function") {
        await orientation.lock("landscape");
      }
    } catch (e) {
      logger.info("orientation lock not supported", e);
    }
  };

  const dismissInstallHint = () => {
    setShowInstallHint(false);
    try {
      window.localStorage.setItem("ug_install_hint_dismissed", "1");
    } catch {}
  };

  return (
    <ViewportScaler>
      {children}

      {showEdgeGuard && (
        <>
          {/* 左端の透明吸収帯 */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              width: "max(16px, env(safe-area-inset-left))",
              zIndex: 9000,
              background: "transparent",
              touchAction: "none",
            }}
          />
          {/* 右端の透明吸収帯 */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: "max(16px, env(safe-area-inset-right))",
              zIndex: 9000,
              background: "transparent",
              touchAction: "none",
            }}
          />
        </>
      )}

      {showRotateOverlay && (
        <div className={styles.viewport}>
          <div className={styles.viewport__wrap}>
            <h2 className={styles.viewport__title}>横向きでプレイしてください</h2>
            <p className={styles.viewport__description}>
              端末を横向きに回転させてください。
            </p>
            <div className={styles.viewport__controls}>
              <button onClick={requestFullscreenAndLock} className={styles.viewport__button}>
                フルスクリーンで横向きに固定（Android）
              </button>
              <button onClick={() => setShowRotateOverlay(false)} className={styles.viewport__backbutton}>
                閉じる
              </button>
            </div>
            <p className={styles.viewport__warning}>
              ※ iOS Safari ではフルスクリーンロックはできません。端末を物理的に横向きにしてください。
            </p>
          </div>
        </div>
      )}

      {showInstallHint && !showRotateOverlay && (
        <div
          style={{
            position: "fixed",
            left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: "rgba(20,20,28,0.96)",
            color: "#fff",
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom)) 16px",
            borderTop: "1px solid rgba(240,192,64,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: "#f0c040" }}>
              全画面でプレイするにはホーム画面に追加してください
            </div>
            <div style={{ opacity: 0.92 }}>
              Safari下部の <strong>共有ボタン（□↑）</strong> →「<strong>ホーム画面に追加</strong>」を選択し、追加されたアイコンから起動すると、Safariのバーが消えてエッジスワイプによるタブ切替も無効になります。
            </div>
          </div>
          <button
            onClick={dismissInstallHint}
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            閉じる
          </button>
        </div>
      )}
    </ViewportScaler>
  );
}
