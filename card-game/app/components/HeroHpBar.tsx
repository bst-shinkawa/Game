"use client";

import React from "react";
import styles from "@/app/assets/css/Game.Master.module.css";
import { MAX_HERO_HP } from "@/app/constants/gameConstants";

interface HeroHpBarProps {
  hp: number;
  maxHp?: number;
  side: "player" | "enemy";
}

const HeroHpBar: React.FC<HeroHpBarProps> = ({ hp, maxHp = MAX_HERO_HP, side }) => {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const fillClass =
    pct > 55 ? styles.hero_hp_bar_high :
    pct > 25 ? styles.hero_hp_bar_mid :
    styles.hero_hp_bar_low;

  const posClass = side === "enemy"
    ? styles.hero_hp_bar_wrap_enemy
    : styles.hero_hp_bar_wrap_player;

  return (
    <div className={`${styles.hero_hp_bar_wrap} ${posClass}`}>
      <div
        className={`${styles.hero_hp_bar_fill} ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export default HeroHpBar;
