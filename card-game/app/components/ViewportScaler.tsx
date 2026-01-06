"use client";

import React, { useEffect, useState } from "react";

const DESIGN_W = 1280;
const DESIGN_H = 720;

interface ViewportScalerProps {
  children: React.ReactNode;
  designWidth?: number;
  designHeight?: number;
  background?: string;
}

export default function ViewportScaler({ children, designWidth = DESIGN_W, designHeight = DESIGN_H, background = "#000" }: ViewportScalerProps) {
  const [scale, setScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ w: designWidth, h: designHeight });

  useEffect(() => {
    const update = () => {
      const sx = window.innerWidth / designWidth; // how many times design width fits the window width
      const sy = window.innerHeight / designHeight; // how many times design height fits the window height
      const s = Math.min(sx, sy); // ensure content always fits both dims
      setScale(s);
      setContainerSize({ w: Math.round(designWidth * s), h: Math.round(designHeight * s) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [designWidth, designHeight]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background,
      }}
    >
      {/* outer box: visual size matches scaled content */}
      <div style={{ width: containerSize.w, height: containerSize.h, position: "relative", overflow: "hidden" }}>
        {/* inner box: unscaled layout, scaled via transform so typography & layout scale uniformly */}
        <div style={{ width: designWidth, height: designHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
