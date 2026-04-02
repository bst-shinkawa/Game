"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ToastItem {
  id: string;
  message: string;
  type: "error" | "info" | "success";
}

const TOAST_DURATION = 2500;

/**
 * ゲーム内トースト通知を管理するフック
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((message: string, type: ToastItem["type"] = "error") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timerRef.current.delete(id);
    }, TOAST_DURATION);
    timerRef.current.set(id, timer);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      timerRef.current.forEach((timer) => clearTimeout(timer));
      timerRef.current.clear();
    };
  }, []);

  return { toasts, showToast };
}
