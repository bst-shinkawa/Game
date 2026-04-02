"use client";

import React from "react";
import type { ToastItem } from "@/app/hooks/useToast";
import styles from "@/app/assets/css/Game.Master.module.css";

interface ToastProps {
  toasts: ToastItem[];
}

const Toast: React.FC<ToastProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.toast_container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast_item} ${styles[`toast_${toast.type}`]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default Toast;
