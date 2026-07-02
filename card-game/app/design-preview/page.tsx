"use client";

import React from "react";
import Link from "next/link";
import CardItem from "../components/CardItem";
import HeroHpBar from "../components/HeroHpBar";
import ManaBar from "../components/ManaBar";
import { cards } from "../data/cards";
import gameStyles from "../assets/css/Game.Master.module.css";
import styles from "./design-preview.module.css";

const PREVIEW_CARDS = [
  cards.find((c) => c.id === 2)!,
  cards.find((c) => c.id === 6)!,
  cards.find((c) => c.id === 9)!,
  cards.find((c) => c.id === 18)!,
  cards.find((c) => c.id === 15)!,
];

export default function DesignPreviewPage() {
  return (
    <div className={styles.page} data-page="design-preview">
      <section className={styles.guide} data-design-section="guide">
        <h1 className={styles.guideTitle}>Design Mode プレビュー</h1>
        <p className={styles.guideText}>
          Cursor の Agents Window でこのページを開き、<code>Ctrl + Shift + D</code> で Design Mode を有効にしてください。
          要素をクリックして「このボタンを大きく」「カードの間隔を広げて」などと指示すると、エージェントがコードを編集します。
        </p>
      </section>

      <div className={styles.field} data-design-section="game-field">
        <header className={styles.enemyRow} data-design-section="enemy-area">
          <div className={styles.heroBlock} data-design-element="enemy-hero">
            <span className={styles.heroLabel}>Enemy Hero</span>
            <HeroHpBar hp={14} valueClassName={gameStyles.hpYellow} />
          </div>
          <ManaBar type="enemy" maxMana={6} currentMana={4} />
        </header>

        <main className={styles.centerField} data-design-section="battlefield">
          <h2 className={styles.fieldTitle}>バトルフィールド（フィールドカード）</h2>
          <div className={styles.cardRow}>
            {PREVIEW_CARDS.slice(0, 3).map((card) => (
              <div key={card.id} className={styles.cardSlot} data-card-id={card.id}>
                <CardItem
                  uniqueId={`field-${card.id}`}
                  name={card.name}
                  type={card.type}
                  hp={card.hp}
                  maxHp={card.maxHp}
                  attack={card.attack}
                  cost={card.cost}
                  image={card.image}
                  noStatus
                />
              </div>
            ))}
          </div>
        </main>

        <footer className={styles.playerRow} data-design-section="player-area">
          <div className={styles.heroBlock} data-design-element="player-hero">
            <span className={styles.heroLabel}>Player Hero</span>
            <HeroHpBar hp={22} valueClassName={gameStyles.hpWhite} />
          </div>
          <ManaBar type="player" maxMana={7} currentMana={5} />
        </footer>
      </div>

      <section className={styles.handRow} data-design-section="player-hand">
        {PREVIEW_CARDS.map((card) => (
          <div key={`hand-${card.id}`} className={styles.handCard}>
            <CardItem
              uniqueId={`hand-${card.id}`}
              name={card.name}
              type={card.type}
              hp={card.hp}
              maxHp={card.maxHp}
              attack={card.attack}
              cost={card.cost}
              image={card.image}
              inHand
              currentMana={5}
              noStatus
            />
          </div>
        ))}
      </section>

      <nav className={styles.actions} data-design-section="actions">
        <button type="button" className={styles.btnPrimary} data-action="start-cpu">
          CPU対戦を始める
        </button>
        <button type="button" className={styles.btnSecondary} data-action="open-deck">
          デッキ編集
        </button>
        <Link href="/" className={styles.btnGhost} data-action="back-home">
          本編メニューへ
        </Link>
      </nav>
    </div>
  );
}
