"use client";
import React, { useEffect, useState } from "react";
import ViewportScaler from "./ViewportScaler";

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
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", color: "#fff", zIndex: 9999 }}>
          <div style={{ textAlign: "center", padding: 20 }}>
            <h2 style={{ marginBottom: 8 }}>横向きでプレイしてください</h2>
            <p style={{ opacity: 0.9, marginBottom: 12 }}>端末を横向きに回転させるか、フルスクリーンを許可して横向きに固定してください。</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={requestFullscreenAndLock} style={{ padding: "10px 16px", background: "#1e90ff", color: "#fff", border: "none", borderRadius: 6 }}>フルスクリーンで横向きに固定</button>
              <button onClick={() => setShowRotateOverlay(false)} style={{ padding: "10px 16px", background: "#444", color: "#fff", border: "none", borderRadius: 6 }}>閉じる</button>
            </div>
            {!isTouchDevice && <p style={{ opacity: 0.8, marginTop: 10 }}>※ デスクトップでは自動ロックできないことがあります</p>}
          </div>
        </div>
      )}
    </ViewportScaler>
  );
}
