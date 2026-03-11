"use client";
import React, { useEffect, useState } from "react";
import ViewportScaler from "./ViewportScaler";
import styles from "../assets/css/Game.Master.module.css";

export default function AppViewport({ children }: { children: React.ReactNode }) {
  const [showRotateOverlay, setShowRotateOverlay] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(isTouch);
    const check = () => {
      // show overlay on mobile when portrait
      const shouldShow = isTouch && window.innerHeight > window.innerWidth;
      setShowRotateOverlay(shouldShow);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  const requestFullscreenAndLock = async () => {
    if (typeof window === "undefined") return;
    try {
      if (document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen();
      }
      // @ts-ignore
      if (screen?.orientation && (screen.orientation as any).lock) {
        // @ts-ignore
        await (screen.orientation as any).lock("landscape");
      }
    } catch (e) {
      console.info("orientation lock failed or not supported", e);
    }
  };

  return (
    <ViewportScaler>
      {children}

      {showRotateOverlay && (
        <div className={styles.viewport}>
          <div className={styles.viewport__wrap}>
            <h2 className={styles.viewport__title}>横向きでプレイしてください</h2>
            <p className={styles.viewport__description}>端末を横向きに回転させるか、フルスクリーンを許可して横向きに固定してください。</p>
            <div className={styles.viewport__controls}>
              <button onClick={requestFullscreenAndLock} className={styles.viewport__button}>フルスクリーンで横向きに固定</button>
              <button onClick={() => setShowRotateOverlay(false)} className={styles.viewport__backbutton}>閉じる</button>
            </div>
            {!isTouchDevice && <p className={styles.viewport__warning}>※ デスクトップでは自動ロックできないことがあります</p>}
          </div>
        </div>
      )}
    </ViewportScaler>
  );
}
