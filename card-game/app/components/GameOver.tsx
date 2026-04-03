// GameOver.tsx
import React from "react";
import styles from "../assets/css/Game.Master.module.css";
import type { GameOverReason } from "../types/gameTypes";

type Props = {
  winner: null | "player" | "enemy";
  reason?: GameOverReason;
  playerRole?: "king" | "usurper" | null;
  turn?: number;
  onRestart: () => void;
  onMenu: () => void;
};

function getResultText(
  winner: "player" | "enemy",
  reason: GameOverReason | undefined,
  playerRole: "king" | "usurper" | null | undefined
): { title: string; subtitle: string } {
  const isWin = winner === "player";

  if (reason === "hand_empty") {
    if (isWin) {
      return { title: "YOU WIN", subtitle: "相手の手札を枯らした" };
    } else {
      return { title: "YOU LOSE", subtitle: "手札が尽きた" };
    }
  }

  if (reason === "survival") {
    if (isWin) {
      return { title: "YOU WIN", subtitle: "10ラウンド耐えきった" };
    } else {
      return { title: "YOU LOSE", subtitle: "10ラウンド耐えられなかった" };
    }
  }

  // reason === "hp" or undefined
  if (isWin) {
    return { title: "YOU WIN", subtitle: "相手のHPを0にした" };
  } else {
    return { title: "YOU LOSE", subtitle: "HPが尽きた" };
  }
}

const GameOver: React.FC<Props> = ({ winner, reason, playerRole, turn, onRestart, onMenu }) => {
  if (!winner) return null;
  const { title, subtitle } = getResultText(winner, reason, playerRole);
  const rounds = turn ? Math.ceil(turn / 2) : undefined;
  const isWin = winner === "player";

  return (
    <div style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{
        background: "rgba(0,0,0,0.9)",
        color: "#fff",
        padding: 40,
        borderRadius: 12,
        textAlign: "center",
        border: `2px solid ${isWin ? "#f0c040" : "#c04040"}`,
        minWidth: 280,
      }}>
        <h2 style={{ fontSize: 48, margin: 0, color: isWin ? "#f0c040" : "#ff6060" }}>{title}</h2>
        <p style={{ fontSize: 20, color: "#ddd", margin: "10px 0 0 0" }}>{subtitle}</p>
        {rounds !== undefined && (
          <p style={{ fontSize: 14, color: "#888", margin: "8px 0 0 0" }}>
            {rounds} ラウンドで決着
          </p>
        )}
        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onRestart}>リスタート</button>
          <button onClick={onMenu}>メニューへ戻る</button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
