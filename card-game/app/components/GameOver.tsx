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

  if (reason === "king_board_control") {
    if (isWin) {
      return { title: "YOU WIN", subtitle: "王の軍勢が盤面を維持した" };
    } else {
      return { title: "YOU LOSE", subtitle: "王の軍勢維持を止められなかった" };
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
    <div className={styles.gameOver}>
      <div
        className={`${styles.gameOver__panel} ${isWin ? styles["gameOver__panel--win"] : styles["gameOver__panel--lose"]}`}
      >
        <h2
          className={`${styles.gameOver__title} ${isWin ? styles["gameOver__title--win"] : styles["gameOver__title--lose"]}`}
        >
          {title}
        </h2>
        <p className={styles.gameOver__subtitle}>{subtitle}</p>
        {rounds !== undefined && <p className={styles.gameOver__rounds}>{rounds} ラウンドで決着</p>}
        <div className={styles.gameOver__actions}>
          <button
            type="button"
            onClick={onRestart}
            className={`${styles.gameOver__btn} ${styles["gameOver__btn--primary"]}`}
          >
            リスタート
          </button>
          <button
            type="button"
            onClick={onMenu}
            className={`${styles.gameOver__btn} ${styles["gameOver__btn--secondary"]}`}
          >
            メニューへ戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
