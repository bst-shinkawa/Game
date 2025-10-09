// page.tsx
"use client";
import React, { useRef, useEffect, useState } from "react";
import CardItem from "./components/CardItem";
import ManaBar from "./components/ManaBar";
import useGame from "./Game";
import styles from "./assets/css/Game.Master.module.css";

const Game: React.FC = () => {
  const {
    playerHandCards,
    playerFieldCards,
    playerHeroHp,
    enemyHandCards,
    enemyFieldCards,
    enemyHeroHp,
    draggingCard,
    setDraggingCard,
    dragPosition,
    setDragPosition,
    playerBattleRef,
    currentMana,
    enemyCurrentMana,
    playCardToField,
    endTurn,
    attack,
  } = useGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enemyHeroRef = useRef<HTMLDivElement>(null);
  const enemyFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [arrowStartPos, setArrowStartPos] = useState<{ x: number; y: number } | null>(null);

  const getHpClass = (hp: number) => {
    if (hp === 20) return styles.hpWhite;
    if (hp >= 11) return styles.hpYellow;
    return styles.hpRed;
  };

  // マウス座標を常に更新
  useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const drawArrow = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!draggingCard || !arrowStartPos) return;

    // 手札カードなら矢印を描画しない
    const isHandCard = playerHandCards.some(c => c.uniqueId === draggingCard);
    if (isHandCard) return;

    let endPos = { x: dragPosition.x, y: dragPosition.y };

    const attackingCard = playerFieldCards.find(c => c.uniqueId === draggingCard && c.canAttack);
    if (attackingCard) {
      const targets: { x: number; y: number }[] = [];

      // 敵ヒーロー
      if (enemyHeroRef.current) {
        const rect = enemyHeroRef.current.getBoundingClientRect();
        targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height });
      }

      // 敵フィールドカード
      for (const c of enemyFieldCards) {
        const ref = enemyFieldRefs.current[c.uniqueId];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      }

        if (targets.length > 0) {
          let closest = targets[0];
          let minDist = Math.hypot(dragPosition.x - closest.x, dragPosition.y - closest.y);
          for (const t of targets) {
            const dist = Math.hypot(dragPosition.x - t.x, dragPosition.y - t.y);
            if (dist < minDist) {
              closest = t;
              minDist = dist;
            }
          }
          endPos = closest;
        }
      }

      const canvasRect = canvas.getBoundingClientRect();
      const startX = arrowStartPos.x - canvasRect.left;
      const startY = arrowStartPos.y - canvasRect.top;
      const endX = endPos.x - canvasRect.left;
      const endY = endPos.y - canvasRect.top;

      ctx.strokeStyle = "lime";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowLength = 10;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - Math.PI / 6),
        endY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + Math.PI / 6),
        endY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.lineTo(endX, endY);
      ctx.fillStyle = "lime";
      ctx.fill();
    };

    let id: number;
    const tick = () => {
      drawArrow();
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [draggingCard, dragPosition, arrowStartPos, playerFieldCards, playerHandCards, enemyFieldCards]);


  return (
    <div className={styles.field}>
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", left: 0, top: 0, pointerEvents: "none", zIndex: 9998 }}
      />

      {/* 敵エリア */}
      <div className={styles.field_enemy}>
        <div
          ref={enemyHeroRef}
          className={styles.field_enemy_hero}
          onDragOver={(e) => draggingCard && e.preventDefault()}
          onDrop={() => {
            if (!draggingCard) return;
            attack(draggingCard, "hero", true);
            setDraggingCard(null);
            setArrowStartPos(null);
          }}
        >
          <div className={styles.field_enemy_hero_wrap}>
            <div className={styles.field_enemy_hero_hp}>
              <p className={getHpClass(enemyHeroHp)}>{enemyHeroHp}</p>
            </div>
          </div>
        </div>

        <div className={styles.field_enemy_battle}>
          {enemyFieldCards.map((card) => (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              onDragOver={(e) => draggingCard && e.preventDefault()}
              onDrop={() => {
                if (!draggingCard) return;
                attack(draggingCard, card.uniqueId, true);
                setDraggingCard(null);
                setArrowStartPos(null);
              }}
              isTarget={false}
              // 各カードのDOMを参照に保持
              ref={(el: HTMLDivElement | null) => {
                enemyFieldRefs.current[card.uniqueId] = el;
              }}
            />
          ))}
        </div>

        <div className={styles.field_enemy_hand}>
          {enemyHandCards.map((card) => (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
            />
          ))}
        </div>

        <div className={styles.field_enemy_mana}>
          <ManaBar maxMana={10} currentMana={enemyCurrentMana} />
        </div>

        {/* エネミー持ち時間 */} 
        <div className={styles.field_enemy_timer}> 
          <p>60</p> 
        </div> 

        {/* エネミーステータス */}
        <div className={styles.field_enemy_status}>
          <p className={styles.field_enemy_status_hand}>0</p> 
          <p className={styles.field_enemy_status_deck}>0</p> <p className={styles.field_player_status_death}>0</p> 
        </div>

      </div>

      {/* プレイヤーエリア */}
      <div className={styles.field_player}>
        <div className={styles.field_player_hero}>
          <div className={styles.field_player_hero_wrap}>
            <div className={styles.field_player_hero_hp}>
              <p className={getHpClass(playerHeroHp)}>{playerHeroHp}</p>
            </div>
          </div>
        </div>

        <div
          className={styles.field_player_battle}
          ref={playerBattleRef}
          onDragOver={(e) => {
            const isHandCard = playerHandCards.some((c) => c.uniqueId === draggingCard);
            if (draggingCard && isHandCard) e.preventDefault();
          }}
          onDrop={() => {
            const card = playerHandCards.find((c) => c.uniqueId === draggingCard);
            if (draggingCard && card) {
              playCardToField(card);
              setDraggingCard(null);
              setArrowStartPos(null);
            }
          }}
        >
          {playerFieldCards.map((card) => (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              draggable={card.canAttack}
              onDragStart={(e) => {
                setDraggingCard(card.uniqueId);
                const rect = e.currentTarget.getBoundingClientRect();
                const startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                setArrowStartPos(startPos);
                setDragPosition(startPos);
              }}
              onDragEnd={() => {
                setDraggingCard(null);
                setArrowStartPos(null);
              }}
            />
          ))}
        </div>

        <div className={styles.field_player_hand}>
          {playerHandCards.map((card) => (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              draggable
              inHand
              currentMana={currentMana}
              onDragStart={(e) => {
                setDraggingCard(card.uniqueId);
                const rect = e.currentTarget.getBoundingClientRect();
                const startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                setArrowStartPos(startPos);
                setDragPosition(startPos);
              }}
              onDragEnd={() => {
                setDraggingCard(null);
                setArrowStartPos(null);
              }}
            />
          ))}
        </div>

        <div className={styles.field_player_mana}>
          <ManaBar maxMana={10} currentMana={currentMana} />
        </div>

        {/* プレイヤー持ち時間 */} 
        <div className={styles.field_player_timer}> 
          <p>60</p> 
        </div> 

        {/* プレイヤーステータス */}
        <div className={styles.field_player_status}>
          <p className={styles.field_player_status_hand}>0</p> 
          <p className={styles.field_player_status_deck}>0</p> <p className={styles.field_player_status_death}>0</p> 
        </div>

      </div>

      <div className={styles.field_turn}>
        <button onClick={endTurn}>TurnEnd</button>
      </div>
    </div>
  );
};

export default Game;
