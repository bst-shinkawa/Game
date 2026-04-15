"use client";

import React from "react";
import styles from "@/app/assets/css/Game.Master.module.css";
import { MAX_HERO_HP } from "@/app/constants/gameConstants";

interface HeroHpBarProps {
  hp: number;
  maxHp?: number;
  /** 残りHP数値の色（例: hpWhite / hpYellow / hpRed） */
  valueClassName?: string;
}

/** 親（field_player_hero / field_enemy_hero）の DOM 順で枠の上／下に配置する想定 */
const HeroHpBar: React.FC<HeroHpBarProps> = ({ hp, maxHp = MAX_HERO_HP, valueClassName }) => {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const fillClass =
    pct > 55 ? styles.hero_hp_bar_high :
    pct > 25 ? styles.hero_hp_bar_mid :
    styles.hero_hp_bar_low;

  return (
    <div className={styles.hero_hp_row}>
      <div className={styles.hero_hp_bar_track}>
        <div
          className={`${styles.hero_hp_bar_fill} ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`${styles.hero_hp_value}${valueClassName ? ` ${valueClassName}` : ""}`}>{hp}</span>
    </div>
  );
};

export default HeroHpBar;
