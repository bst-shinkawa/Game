"use client";

import React, { useRef } from "react";
import CardItem from "./CardItem";
import ManaBar from "./ManaBar";
import Image from "next/image";
import type { Card } from "@/app/data/cards";
import styles from "@/app/assets/css/Game.Master.module.css";
import handIcon from "@/public/img/field/hand-icon.png";
import deckIcon from "@/public/img/field/deck-icon.png";
import deathIcon from "@/public/img/field/void-icon.png";
import cardBack from "@/public/img/field/card_back.png";
import TimerCircle, { TimerController } from "./TimerCircle";
import { TurnTimer } from "@/app/data/turnTimer";

interface EnemyAreaProps {
  enemyHeroHp: number;
  enemyHandCards: Card[];
  enemyFieldCards: (Card & { maxHp: number; canAttack?: boolean })[];
  enemyDeck: Card[];
  enemyGraveyard: Card[];
  enemyCurrentMana: number;
  turnSecondsRemaining: number;
  isPlayerTurn: boolean;
  draggingCard: string | null;
  playerHandCards: Card[];
  enemyAttackAnimation: { sourceCardId: string | null; targetId: string | "hero" } | null;
  enemySpellAnimation: { targetId: string | "hero"; effect: string } | null;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (targetId: string | "hero") => void;
  onCardHoverEnter?: (cardId: string) => void;
  onCardHoverLeave?: () => void;
  onCardClick?: (cardId: string) => void;
  enemyHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  enemyFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  enemyTimerRef: React.MutableRefObject<TimerController | null>;
  isTimerActive: boolean;
  enemyTurnTimer?: TurnTimer | null;
}

export const EnemyArea: React.FC<EnemyAreaProps & { hoverTarget?: { type: string | null; id?: string | null }, dropSuccess?: { type: string | null; id?: string | null }, attackTargets?: string[] }> = ({
  enemyHeroHp,
  enemyHandCards,
  enemyFieldCards,
  enemyDeck,
  enemyGraveyard,
  enemyCurrentMana,
  turnSecondsRemaining,
  isPlayerTurn,
  draggingCard,
  playerHandCards,
  enemyAttackAnimation,
  enemySpellAnimation,
  onDragOver,
  onDrop,
  onCardHoverEnter,
  onCardHoverLeave,
  enemyHeroRef,
  enemyFieldRefs,
  enemyTimerRef,
  isTimerActive,
  enemyTurnTimer,
  hoverTarget,
  dropSuccess,
  attackTargets = [],
}) => {
  console.log('EnemyArea attackTargets:', attackTargets);
  const getHpClass = (hp: number) => {
    if (hp === 20) return styles.hpWhite;
    if (hp >= 11) return styles.hpYellow;
    return styles.hpRed;
  };

  const enemyHandCount = enemyHandCards.length;
  const enemyMaxAngle = -20;
  const enemyAngleStep = (enemyHandCount > 1) ? (enemyMaxAngle * 2) / (enemyHandCount - 1) : 0;

  return (
    <div className={`${styles.field_enemy} ${enemySpellAnimation ? styles.spell_cast_flash : ""}`}>
      {/* 敵ヒーロー */}
      <div
        ref={enemyHeroRef}
        className={`${styles.field_enemy_hero} ${hoverTarget?.type === 'enemyHero' ? styles.target_highlight : ''} ${dropSuccess?.type === 'enemyHero' ? styles.drop_success : ''} ${attackTargets.includes('hero') ? styles.attack_highlight : ''}`}
        onDragOver={onDragOver}
        onDrop={() => {
          onDrop("hero");
        }}
        style={
          enemySpellAnimation?.targetId === "hero"
            ? { animation: "spellTargetFlash 0.6s ease-out" }
            : enemyAttackAnimation?.targetId === "hero"
            ? { animation: "enemyCardAttack 0.9s ease-in-out forwards" }
            : {}
        }
      >
        <div className={styles.field_enemy_hero_wrap}>
          <div className={styles.field_enemy_hero_hp}>
            <p className={getHpClass(enemyHeroHp)}>{enemyHeroHp}</p>
          </div>
        </div>
      </div>

      {/* 敵フィールド */}
      <div className={styles.field_enemy_battle}>
        {enemyFieldCards.map((card) => {
          const isAttacking = enemyAttackAnimation?.sourceCardId === card.uniqueId;
          const isSummoning = (card as { isAnimating?: boolean }).isAnimating;
          const isSpellTarget = enemySpellAnimation?.targetId === card.uniqueId;
          const isHovered = hoverTarget?.id === card.uniqueId && hoverTarget?.type === 'enemyCard';
          const isDropped = dropSuccess?.id === card.uniqueId && dropSuccess?.type === 'enemyCard';
          console.log('enemy card', card.uniqueId, 'attackTargets', attackTargets, 'includes', attackTargets.includes(card.uniqueId));
          return (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              className={`${isSummoning ? styles.enemy_follower_summon : ""} ${isHovered ? styles.target_highlight : ''} ${isDropped ? styles.drop_success : ''} ${attackTargets.includes(card.uniqueId) ? styles.attack_highlight : ''}`}
              style={{
                ...((card as { isAnimating?: boolean }).isAnimating ? { transform: "translateY(-40px)", opacity: 0 } : {}),
                ...(isAttacking ? { animation: "enemyCardAttack 0.9s ease-in-out forwards" } : {}),
                ...(isSpellTarget ? { animation: "spellTargetFlash 0.6s ease-out" } : {}),
              }}
              onDragOver={onDragOver}
              onDrop={() => onDrop(card.uniqueId)}
              isTarget={false}
              ref={(el: HTMLDivElement | null) => {
                enemyFieldRefs.current[card.uniqueId] = el;
              }}
              onMouseEnter={() => onCardHoverEnter && onCardHoverEnter(card.uniqueId)}
              onMouseLeave={() => onCardHoverLeave && onCardHoverLeave()}
            />
          );
        })}
      </div>

      {/* 敵手札（裏向き） */}
      <div className={styles.field_enemy_hand_area}>
        {enemyHandCards.map((card, i) => {
          const angle = -enemyMaxAngle + enemyAngleStep * i;
          const offsetX = (i - (enemyHandCount - 1) / 2) * 5;

          const style: React.CSSProperties = {
            transform: `translateX(${offsetX}px) rotate(${angle}deg)`,
            marginLeft: i === 0 ? '0' : '-30px',
            zIndex: i,
            transition: 'transform 0.3s ease',
          };

          return (
            <div
              key={card.uniqueId}
              className={styles.card_back}
              aria-hidden={true}
              style={{
                ...style,
                backgroundImage: `url(${cardBack.src})`
              }}
            />
          );
        })}
      </div>

      {/* 敵マナバー */}
      <div className={styles.field_enemy_mana}>
        <ManaBar maxMana={10} currentMana={enemyCurrentMana} type="enemy" /> 
        {/* ↑ type="enemy" を追加 */}
      </div>

      {/* 敵ターンタイマー */}
      <div className={styles.field_enemy_timer}>
        <TimerCircle 
          ref={enemyTimerRef} 
          duration={60} 
          isPlayerTurn={!isPlayerTurn} 
          type="enemy"
          isTimerActive={!isPlayerTurn && isTimerActive}
          timer={enemyTurnTimer}
        />
      </div>

      {/* 敵ステータス */}
      <div className={styles.field_enemy_status}>
        <div className={styles.field_enemy_status_item}>
          <Image src={handIcon} alt="敵手札" /><span>{enemyHandCards.length}</span>
        </div>
        <div className={styles.field_enemy_status_item}>
          <Image src={deckIcon} alt="敵デッキ" /><span>{enemyDeck.length}</span>
        </div>
        <div className={styles.field_player_status_item}>
          <Image src={deathIcon} alt="敵墓地" /><span>{enemyGraveyard.length}</span>
        </div>
      </div>
    </div>
  );
};
