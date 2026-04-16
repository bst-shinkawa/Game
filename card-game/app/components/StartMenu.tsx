// StartMenu.tsx
import React from "react";
import styles from "../assets/css/Game.Master.module.css";

type Props = {
  onSelectMode: (mode: "cpu" | "pvp") => void;
  onDeck: () => void;
};

const StartMenu: React.FC<Props> = ({ onSelectMode, onDeck }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20}}>
      <h1 style={{ color: "#fff", fontSize: 48 }}>Usurper's Gambit</h1>
      <div className={styles.field_turn} style={{ display: "flex", gap: 12, color: "#fff", flexDirection: "unset" }}>
        <button onClick={() => onSelectMode("cpu")} style={{ color: "#d0d0d0", cursor: "pointer" }}>
          CPU対戦
        </button>
        <button disabled title="準備中" style={{ cursor: "not-allowed" }}>
          ネット対戦
        </button>
        <button onClick={onDeck} style={{ cursor: "pointer" }}>
          デッキ作成
        </button>
      </div>
      <p style={{ color: "#d0d0d0", maxWidth: 600, textAlign: "center" }}>
        CPU対戦とデッキ作成は利用できます。<br />デッキ作成で保存した内容は次の対戦から反映されます。
      </p>

      <div style={{ border: "1px solid #fff", padding: 30, borderRadius: 10, marginTop: 20 }}>
        <p style={{ color: "#fff", fontSize: 24 ,textAlign: "center"}}>ルール説明</p>
        <p style={{ color: "#fff", paddingTop: 30}}>
          先攻は、<span style={{ color: "#f0c040"}}>王様デッキ</span><br />
          後攻は、<span style={{ color: "#f0c040"}}>簒奪者デッキ</span>
        </p>
        <p style={{ paddingTop: 30, color: "#fff"}}>
          <span style={{ color: "#f0c040"}}>勝利条件</span><br />
          相手プレイヤーの体力を0にする
          <br />
          <br />
          <span style={{ color: "#f0c040"}}>特殊勝利条件</span><br />
          <span style={{ color: "#f0c040"}}>王様：</span>10ラウンド耐えきる、もしくは自分の場に3体以上を合計5回達成すると勝利<br />
          <span style={{ color: "#f0c040"}}>簒奪者：</span>10ラウンド以内に倒しきる、もしくは王様の手札を0枚にすると勝利
        </p>
        <p style={{ paddingTop: 30, color: "#fff"}}>
          王側は、場に3枚カード出している状態で特殊ボーナスを発生<br />
          簒奪者側は、1ターン事に使用する暗器の使用回数によって特殊ボーナスを発生<br />
        </p>
      </div>
    </div>
  );
};

export default StartMenu;
