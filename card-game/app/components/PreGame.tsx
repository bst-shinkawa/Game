"use client";

import React, { useEffect, useRef } from "react";
import CardItem from "./CardItem";
import type { Card } from "@/app/data/cards";
import styles from "@/app/assets/css/Game.Master.module.css";

interface PreGameProps {
  coinResult: "deciding" | "player" | "enemy";
  showCoinPopup: boolean;
  rouletteRunning: boolean;
  rouletteLabel: string;
  playerHandCards: Card[];
  currentMana: number;
  mulliganTimer: number;
  swapIds: string[];
  // Handlers
  onRouletteAnimEnd: () => void;
  onSwapToggle: (cardId: string) => void;
  onMulliganSubmit: () => void;
  onMulliganSkip: () => void;
  setRouletteRunning: (running: boolean) => void;
  setSwapIds: (ids: string[]) => void;
}

export const PreGame: React.FC<PreGameProps> = ({
  coinResult,
  showCoinPopup,
  rouletteRunning,
  rouletteLabel,
  playerHandCards,
  currentMana,
  mulliganTimer,
  swapIds,
  onRouletteAnimEnd,
  onSwapToggle,
  onMulliganSubmit,
  onMulliganSkip,
  setRouletteRunning,
  setSwapIds,
}) => {
  // ルーレット開始（プリゲーム開始時に初回実行）
  useEffect(() => {
    if (coinResult === "deciding" && !rouletteRunning) {
      setRouletteRunning(true);
    }
  }, [coinResult, rouletteRunning, setRouletteRunning]);

  // ルーレット演出：coinResult が "deciding" のみ表示
  if (coinResult === "deciding") {
    return (
      <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 30, borderRadius: 8, textAlign: 'center' }}>
          <h3>先攻/後攻をルーレットで決定中...</h3>
          <div style={{ marginTop: 12 }} className={styles.rouletteWrapper}>
            <div
              className={`${styles.roulette} ${rouletteRunning ? styles.spin : ''}`}
              onAnimationEnd={onRouletteAnimEnd}
              role="img"
              aria-label="roulette"
            >
              <div className={styles.rouletteLabel}>{rouletteRunning ? '...' : (rouletteLabel === 'player' ? 'プレイヤー' : '敵')}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // coinResult が決定済みかつ coinPopup 表示中：コイン結果を表示
  if (showCoinPopup) {
    return (
      <div className={styles.coinPopup} role="alert" aria-live="polite">
        <div className={styles.coinPopupInner}>
          <div className={styles.coinPopupWinner}>{coinResult === 'player' ? 'あなたは先攻' : 'あなたは後攻'}</div>
        </div>
      </div>
    );
  }

  // coinResult が決定済みかつ coinPopup が非表示：マリガン画面を表示
  return (
    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(0,0,0,0.95)', color: '#fff', padding: 20, borderRadius: 8, textAlign: "center" }}>
        <h3>{coinResult === 'player' ? 'あなたは先攻' : 'あなたは後攻'}</h3>
        <p>交換したいカードを選択してください<br></br>（選択後は「交換」を押してください）<br></br>制限時間: {mulliganTimer}s</p>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          {playerHandCards.map((c) => {
            const marked = swapIds.includes(c.uniqueId);
            return (
              <div key={c.uniqueId} style={{ padding: 6 }}>
                <CardItem
                  {...c}
                  hp={c.hp ?? 0}
                  maxHp={c.maxHp ?? 0}
                  attack={c.attack ?? 0}
                  inHand
                  currentMana={currentMana}
                  selected={marked}
                  noStatus={true}
                  onClick={() => onSwapToggle(c.uniqueId)}
                />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={onMulliganSubmit}>交換</button>
          <button onClick={onMulliganSkip}>交換せず開始</button>
        </div>
      </div>
    </div>
  );
};
