"use client";
import React, { useEffect, useState, useRef } from "react";
import CardItem from "./components/CardItem";
import { Card } from "./data/cards";
import { deck, drawInitialHand } from "./data/game";
import styles from "./assets/css/Game.Master.module.css";

const Game: React.FC = () => {
    const [playerHandCards, setPlayerHandCards] = useState<Card[]>([]);
    const [playerFieldCards, setPlayerFieldCards] = useState<Card[]>([]);
    const [enemyHandCards, setEnemyHandCards] = useState<Card[]>([]);
    const [enemyFieldCards, setEnemyFieldCards] = useState<Card[]>([]);
    const [draggingCard, setDraggingCard] = useState<string | null>(null);
    const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const playerBattleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPlayerHandCards(drawInitialHand(deck, 5));
        setEnemyHandCards(drawInitialHand(deck, 5));
    }, []);

    useEffect(() => {
        const handleMouseUp = (e: MouseEvent) => {
            if (!draggingCard) return;
            const fieldElem = playerBattleRef.current?.getBoundingClientRect();
            if (!fieldElem) return;

            const card = playerHandCards.find(c => c.uniqueId === draggingCard);
            if (!card) return;

            if (e.clientY >= fieldElem.top && e.clientY <= fieldElem.bottom) {
            // スペルは発動して消える
            if (card.type === "spell") {
                console.log(`${card.name} のスペル効果を発動！`);
                // 他のスペル効果処理もここに追加可能
            } else {
                // フォロワーはフィールドに出す
                setPlayerFieldCards(prev => [...prev, card]);
            }

            // 手札からは必ず削除
            setPlayerHandCards(prev => prev.filter(c => c.uniqueId !== draggingCard));
            }

            setDraggingCard(null);
        };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
    }, [draggingCard, playerHandCards]);
        
  return (
    
    <div className={styles.field}>

      <div className={styles.field_enemy}>

        <div className={styles.field_enemy_hero}>
            <div className={styles.field_enemy_hero_wrap}>
                {/* <img src="" alt=""> */}
                <div className={styles.field_enemy_hero_hp}>
                    <p>20</p>
                </div>
            </div>
        </div>

        <div className={styles.field_enemy_battle}>
            {enemyFieldCards.map(card => (
                <CardItem key={card.uniqueId} {...card} />
            ))}
        </div>


        <div className={styles.field_enemy_hand}>
            {enemyHandCards.map(card => (
                <CardItem key={card.uniqueId} {...card} />
            ))}
        </div>

        <div className={styles.field_enemy_mana}>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
            <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
        </div>

        <div className={styles.field_enemy_timer}>
            <p>60</p>
        </div>

        <div className={styles.field_enemy_status}>
            <div className={styles.field_enemy_status_hand}>
                <p>10</p>
            </div>
            <div className={styles.field_enemy_status_deck}>
                <p>30</p>
            </div>
            <div className={styles.field_enemy_status_deth}>
                <p>0</p>
            </div>
        </div>

    </div>

      <div className={styles.field_player}>
        <div className={styles.field_player_hero}>
            <div className={styles.field_player_hero_wrap}>
                {/* <img src="" alt=""> */}
                <div className={styles.field_player_hero_hp}>
                    <p>20</p>
                </div>
            </div>
        </div>

        <div className={styles.field_player_battle} ref={playerBattleRef}>
            {playerFieldCards.map(card => (
                <CardItem key={card.uniqueId} {...card} />
            ))}
        </div>

        <div className={styles.field_player_hand}>
            {playerHandCards.map(card => (
                <CardItem
                key={card.uniqueId}
                {...card}
                draggingCard={draggingCard}
                setDraggingCard={setDraggingCard}
                setDragPosition={setDragPosition}
                />
            ))}
        </div>

        {draggingCard && (() => {
          const card = playerHandCards.find(c => c.uniqueId === draggingCard);
          if (!card) return null;
          return (
            <CardItem
              key={card.uniqueId}
              {...card}
              draggingCard={draggingCard}
              setDraggingCard={setDraggingCard}
              setDragPosition={setDragPosition}
              style={{ position: "fixed", left: dragPosition.x - 50, top: dragPosition.y - 70, zIndex: 9999 }}
            />
          );
        })()}

        


          <div className={styles.field_player_timer}>
              <p>60</p>
          </div>

          <div className={styles.field_player_status}>
              <div className={styles.field_player_status_hand}>
                  <p>10</p>
              </div>
              <div className={styles.field_player_status_deck}>
                  <p>30</p>
              </div>
              <div className={styles.field_player_status_deth}>
                  <p>0</p>
              </div>
          </div>

          <div className={styles.field_player_mana}>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
          </div>

      </div>

      <div className={styles.field_turn}>
          <button>TurnEnd</button>
      </div>

  </div>


    
  );
};

export default Game;