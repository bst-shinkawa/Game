"use client";
import React, { useEffect, useState } from "react";
import CardItem from "./components/CardItem";
import { Card, CardType } from "./data/cards";
import { deck } from "./data/game";
import styles from "./assets/css/Game.Master.module.css";

// ユニークID生成関数
const generateUniqueId = () => Math.random().toString(36).substr(2, 9);

const Game: React.FC = () => {
  const [playerHandCards, setPlayerHandCards] = useState<Card[]>([]);
  const [playerFieldCards, setPlayerFieldCards] = useState<Card[]>([]);
  const [enemyHandCards, setEnemyHandCards] = useState<Card[]>([]);
  const [enemyFieldCards, setEnemyFieldCards] = useState<Card[]>([]);
  
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // プレイヤー初期手札
  useEffect(() => {
    const deckCopy = [...deck];
    const initialHand: Card[] = [];
    for (let i = 0; i < 5; i++) {
      if (deckCopy.length === 0) break;
      const randomIndex = Math.floor(Math.random() * deckCopy.length);
      const card = { ...deckCopy.splice(randomIndex, 1)[0], uniqueId: generateUniqueId() };
      initialHand.push(card);
    }
    setPlayerHandCards(initialHand);
  }, []);

  // 敵初期手札
  useEffect(() => {
    const deckCopy = [...deck];
    const initialHand: Card[] = [];
    for (let i = 0; i < 5; i++) {
      if (deckCopy.length === 0) break;
      const card = { ...deckCopy.splice(Math.floor(Math.random() * deckCopy.length), 1)[0], uniqueId: generateUniqueId() };
      initialHand.push(card);
    }
    setEnemyHandCards(initialHand);
  }, []);

  // ドロップ判定
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (!draggingCard) return;

      const fieldElem = document.querySelector(`.${styles.field_player_battle}`)?.getBoundingClientRect();
      if (fieldElem) {
        const card = playerHandCards.find(c => c.uniqueId === draggingCard);
        if (card && e.clientY >= fieldElem.top && e.clientY <= fieldElem.bottom) {
          setPlayerHandCards(prev => prev.filter(c => c.uniqueId !== draggingCard));
          setPlayerFieldCards(prev => [...prev, card]);
        }
      }

      setDraggingCard(null);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [draggingCard, playerHandCards]);

  return (
    <div className={styles.field}>
      <div className={styles.field_player}>
        <div className={styles.field_player_battle}>
          {playerFieldCards.map(card => (
            <CardItem
              key={card.uniqueId}
              uniqueId={card.uniqueId}
              name={card.name}
              type={card.type}
              hp={card.hp}
              attack={card.attack}
              image={card.image}
            />
          ))}
        </div>

        <div className={styles.field_player_hand}>
          {playerHandCards.map(card => (
            <CardItem
              key={card.uniqueId}
              uniqueId={card.uniqueId}
              name={card.name}
              type={card.type}
              hp={card.hp}
              attack={card.attack}
              image={card.image}
              draggingCard={draggingCard}
              setDraggingCard={setDraggingCard}
              setDragPosition={setDragPosition}
            />
          ))}
        </div>

        {/* ドラッグ中カード */}
        {draggingCard && (() => {
          const card = playerHandCards.find(c => c.uniqueId === draggingCard);
          if (!card) return null;
          return (
            <CardItem
              key={card.uniqueId}
              uniqueId={card.uniqueId}
              name={card.name}
              type={card.type}
              hp={card.hp}
              attack={card.attack}
              image={card.image}
              draggingCard={draggingCard}
              setDraggingCard={setDraggingCard}
              setDragPosition={setDragPosition}
              style={{
                position: "fixed",
                left: dragPosition.x - 50,
                top: dragPosition.y - 70,
                zIndex: 9999
              }}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default Game;
