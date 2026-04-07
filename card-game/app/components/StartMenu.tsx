// StartMenu.tsx
import React from "react";
import styles from "../assets/css/Game.Master.module.css";

type Props = {
  onSelectMode: (mode: "cpu" | "pvp") => void;
  onDeck: () => void;
};

const StartMenu: React.FC<Props> = ({ onSelectMode, onDeck }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <h1 style={{ color: "#fff", fontSize: 48 }}>Usurper's Gambit</h1>
      <div style={{ display: "flex", gap: 12, color: "#fff" }}>
        <button className={styles.field_turn ? "" : ""} onClick={() => onSelectMode("cpu")} style={{color: "#d0d0d0"}}>CPU対戦</button>
        <button onClick={onDeck} disabled title="準備中">ネット対戦</button>
        <button onClick={onDeck} disabled title="準備中">デッキ作成</button>
      </div>
      <p style={{ color: "#d0d0d0", maxWidth: 600, textAlign: "center" }}>
        デッキ作成は後で実装します。今は CPU 対戦でゲームを開始してください。
      </p>

      <div style={{ border: "1px solid #fff", padding: 30, borderRadius: 10, marginTop: 20 }}>
        <p style={{ color: "#fff", fontSize: 24 ,textAlign: "center"}}>ルール説明</p>
        <p style={{ color: "#fff", paddingTop: 30}}>
          先攻は、<span style={{ color: "#f0c040"}}>王様デッキ</span><br />
          後攻は、<span style={{ color: "#f0c040"}}>簒奪者デッキ</span>
        </p>
        <p style={{ paddingTop: 30, color: "#fff"}}>
          <span style={{ color: "#f0c040"}}>勝利条件</span><br />
          相手のヒーローの体力を0にする
          <br />
          <br />
          <span style={{ color: "#f0c040"}}>特殊勝利条件</span><br />
          <span style={{ color: "#f0c040"}}>王様：</span>10ラウンド耐えきる、もしくは簒奪者の手札を枯らした方が勝利です。<br />
          <span style={{ color: "#f0c040"}}>簒奪者：</span>10ラウンド以内に倒しきる、もしくは王様の手札を枯らした方が勝利です。
        </p>
        <p style={{ paddingTop: 30, color: "#fff"}}>
          王側は、場に3枚カード出していることで特殊ボーナスを発生<br />
          簒奪者側は、1ターン事に使用する暗器の使用回数によって特殊ボーナスを発生<br />
        </p>
      </div>
    </div>
  );
};

export default StartMenu;
