"use client";

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

type ManaCrystalProps = {
  isActive: boolean;
  type: "player" | "enemy"; // プレイヤー用か敵用か
};

export const ManaCrystal = ({ isActive, type }: ManaCrystalProps) => {
  // --- 【変更点1】プレイヤーとエネミー、両方のカラーテーマを定義 ---
  const colors = {
    player: {
      gem: "bg-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] border-cyan-200",
      socket: "border-cyan-900/50 bg-cyan-950/30",
    },
    enemy: {
      gem: "bg-red-500 shadow-[0_0_15px_rgba(225,29,72,0.6)] border-rose-200",
      socket: "border-rose-900/50 bg-rose-950/30",
    },
  };
  
  // --- 【変更点2】渡された type に基づいて現在のテーマを選択 ---
  const currentTheme = colors[type];

  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      
      {/* 1. ソケット（空の台座）: 常に表示 */}
      <div
        className={clsx(
          "absolute w-6 h-6 border-2 rounded-full",
          currentTheme.socket 
        )}
      />

      {/* 2. ジェム（宝石）: isActiveの時だけ表示 & アニメーション制御 */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="mana-gem" 
            className={clsx(
              "absolute w-6 h-6 border rounded-full",
              "flex items-center justify-center",
              currentTheme.gem 
            )}
            // --- 登場アニメーション（回復時） ---
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            // --- 消費アニメーション（スタイリッシュ！） ---
            exit={{ 
              scale: 1.8, 
              opacity: 0,
              filter: "blur(4px)",
              transition: { duration: 0.3, ease: "easeOut" } 
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* 宝石内部のハイライト（光沢） */}
            <div className="w-full h-[50%] bg-gradient-to-b from-white/40 to-transparent absolute top-0 left-0 rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};