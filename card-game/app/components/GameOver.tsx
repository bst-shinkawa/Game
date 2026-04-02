// GameOver.tsx
import React from "react";
import styles from "../assets/css/Game.Master.module.css";

type Props = {
  winner: null | "player" | "enemy";
  turn?: number;
  onRestart: () => void;
  onMenu: () => void;
};

const GameOver: React.FC<Props> = ({ winner, turn, onRestart, onMenu }) => {
  if (!winner) return null;
  const text = winner === "player" ? "YOU WIN" : "YOU LOSE";
  // ターン数の計算（奇数ターン=プレイヤー、偶数=敵なので÷2で概算ラウンド数）
  const rounds = turn ? Math.ceil(turn / 2) : undefined;
  return (
    <div style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "rgba(0,0,0,0.85)", color: "#fff", padding: 40, borderRadius: 12, textAlign: "center" }}>
        <h2 style={{ fontSize: 48, margin: 0 }}>{text}</h2>
        {rounds !== undefined && (
          <p style={{ fontSize: 18, color: "#aaa", margin: "12px 0 0 0" }}>
            {rounds} ラウンドで決着
          </p>
        )}
        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onRestart}>リスタート</button>
          <button onClick={onMenu}>メニューへ戻る</button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
