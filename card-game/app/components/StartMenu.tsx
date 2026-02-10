// StartMenu.tsx
import React from "react";
import styles from "../assets/css/Game.Master.module.css";

type Props = {
  onSelectMode: (mode: "cpu" | "pvp") => void;
  onDeck: () => void;
};

const StartMenu: React.FC<Props> = ({ onSelectMode, onDeck }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: "10vh" }}>
      <h1 style={{ color: "#fff", fontSize: 48 }}>Card Game</h1>
      <div style={{ display: "flex", gap: 12, color: "#fff" }}>
        <button className={styles.field_turn ? "" : ""} onClick={() => onSelectMode("cpu")}>CPU対戦</button>
        <button onClick={() => onSelectMode("pvp")}>ネット対戦</button>
        <button onClick={onDeck}>デッキ作成</button>
      </div>
      <p style={{ color: "#d0d0d0", maxWidth: 600, textAlign: "center" }}>
        デッキ作成は後で実装します。今は CPU 対戦でゲームを開始してください。
      </p>
    </div>
  );
};

export default StartMenu;
