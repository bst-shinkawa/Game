"use client";

import React, { useEffect, useState, useRef } from "react";
import ViewportContext from "@/app/context/ViewportContext";

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
  const outerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerOffset, setContainerOffset] = useState({ left: 0, top: 0 });

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
      // also update container offset after layout
      const updateOffset = () => {
        const el = containerRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          setContainerOffset({ left: Math.round(r.left), top: Math.round(r.top) });
        }
      };
      updateOffset();
      window.addEventListener("resize", updateOffset);
      window.addEventListener("orientationchange", updateOffset);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
        window.removeEventListener("resize", updateOffset);
        window.removeEventListener("orientationchange", updateOffset);
    };
  }, [designWidth, designHeight]);

  return (
    <div
      ref={outerRef}
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
      <div ref={containerRef} style={{ width: containerSize.w, height: containerSize.h, position: "relative", overflow: "hidden" }}>
        <ViewportContext.Provider value={{ scale: Math.round(scale * 100) / 100, containerLeft: containerOffset.left, containerTop: containerOffset.top, containerWidth: containerSize.w, containerHeight: containerSize.h }}>
          {/* inner box: unscaled layout, scaled via transform so typography & layout scale uniformly */}
          <div style={{ width: designWidth, height: designHeight, transform: `scale(${Math.round(scale * 100) / 100})`, transformOrigin: "top left" }}>
            {children}
          </div>
        </ViewportContext.Provider>
      </div>
    </div>
  );
}
