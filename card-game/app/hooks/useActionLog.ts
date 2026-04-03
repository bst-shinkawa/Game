"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ActionLogEntry {
  id: string;
  message: string;
  icon?: string;
  timestamp: number;
}

const LOG_DISPLAY_DURATION = 2200;
const MAX_VISIBLE = 4;

export function useActionLog() {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addLog = useCallback((message: string, icon?: string) => {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: ActionLogEntry = { id, message, icon, timestamp: Date.now() };

    setEntries((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    });

    const timer = setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      timerRef.current.delete(id);
    }, LOG_DISPLAY_DURATION);

    timerRef.current.set(id, timer);
  }, []);

  const clearLog = useCallback(() => {
    timerRef.current.forEach((timer) => clearTimeout(timer));
    timerRef.current.clear();
    setEntries([]);
  }, []);

  useEffect(() => {
    return () => {
      timerRef.current.forEach((timer) => clearTimeout(timer));
      timerRef.current.clear();
    };
  }, []);

  return { entries, addLog, clearLog };
}
