"use client";
import React, { useEffect, useState } from "react";
import ViewportScaler from "./ViewportScaler";
import styles from "../assets/css/Game.Master.module.css";
import { logger } from "../lib/logger";

export default function AppViewport({ children }: { children: React.ReactNode }) {
  const [showRotateOverlay, setShowRotateOverlay] = useState(false);

  // matchMedia で端末の向きを監視（resize より確実で iOS 対応）
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const isTouchLike = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      // タッチ端末が縦持ちのときのみオーバーレイを表示
      setShowRotateOverlay(isTouchLike && e.matches);
    };

    // 初回チェック
    handle(mq);

    // イベント登録（addEventListenerが使えない古いブラウザは addListener フォールバック）
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
    } catch {
      // iOS Safari は fullscreenEnabled=false なので正常パス
    }
    try {
      const orientation = screen?.orientation as (ScreenOrientation & { lock?: (type: string) => Promise<void> }) | undefined;
      if (typeof orientation?.lock === "function") {
        await orientation.lock("landscape");
      }
    } catch (e) {
      // iOS はここで必ず例外になる。ログだけ残す
      logger.info("orientation lock not supported", e);
    }
  };

  return (
    <ViewportScaler>
      {children}

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
    </ViewportScaler>
  );
}
