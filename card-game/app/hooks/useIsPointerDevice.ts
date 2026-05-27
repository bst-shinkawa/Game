"use client";

import { useState } from "react";

/**
 * タッチ専用端末（iOS / Android）かどうかを判定する。
 * SSR では false を返し、クライアント側での初回 hydration 後に確定する。
 *
 * 用途: HTML5 DnD は iOS Safari 未サポートのため、タッチ端末では
 * draggable 属性を立てず Pointer Events API のみでドラッグを処理する。
 */
export function useIsPointerDevice(): boolean {
  const [isPointer] = useState<boolean>(() => {
    if (typeof window === "undefined") return true; // SSR: PC と仮定
    return window.matchMedia("(pointer: fine)").matches;
  });
  return isPointer;
}
