"use client";

import React from "react";
import type { ActionLogEntry } from "@/app/hooks/useActionLog";
import styles from "@/app/assets/css/Game.Master.module.css";

interface ActionLogProps {
  entries: ActionLogEntry[];
}

const ActionLog: React.FC<ActionLogProps> = ({ entries }) => {
  if (entries.length === 0) return null;

  return (
    <div className={styles.action_log_container}>
      {entries.map((entry) => (
        <div key={entry.id} className={styles.action_log_item}>
          {entry.icon && <span className={styles.action_log_icon}>{entry.icon}</span>}
          <span className={styles.action_log_text}>{entry.message}</span>
        </div>
      ))}
    </div>
  );
};

export default ActionLog;
