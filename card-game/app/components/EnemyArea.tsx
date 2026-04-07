"use client";

import React, { useRef, useEffect } from "react";
import CardItem from "./CardItem";
import ManaBar from "./ManaBar";
import Image from "next/image";
import {
  isEnemyHeroSelectable,
  isEnemyFieldCardSelectable,
} from "@/app/services/selectionService";
import type { Card } from "@/app/data/cards";
import type { RuntimeCard, SelectionMode, SelectionConfig } from "@/app/types/gameTypes";
import styles from "@/app/assets/css/Game.Master.module.css";
import handIcon from "@/public/img/field/hand-icon.png";
import deckIcon from "@/public/img/field/deck-icon.png";
import deathIcon from "@/public/img/field/void-icon.png";
import cardBack from "@/public/img/field/card_back.png";
import TimerCircle, { TimerController } from "./TimerCircle";
import HeroHpBar from "./HeroHpBar";
import { TurnTimer } from "@/app/data/turnTimer";
interface EnemyAreaProps {
  enemyHeroHp: number;
  enemyMaxHeroHp: number;
  preGame: boolean;
  enemyHandCards: Card[];
  enemyFieldCards: RuntimeCard[];
  enemyDeck: Card[];
  enemyGraveyard: Card[];
  enemyCurrentMana: number;
  turnSecondsRemaining: number;
  isPlayerTurn: boolean;
  draggingCard: string | null;
  playerHandCards: Card[];
  playerAttackAnimation: { sourceCardId: string; targetId: string | "hero" } | null;
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
  destroyingCards: Set<string>;
  // 選択モード
  selectionMode: SelectionMode;
  selectionConfig: SelectionConfig | null;
  applySelection: (targetIds: string[]) => void;
}

export const EnemyArea: React.FC<EnemyAreaProps & { hoverTarget?: { type: string | null; id?: string | null }, dropSuccess?: { type: string | null; id?: string | null }, attackTargets?: string[] }> = ({
  enemyHeroHp,
  enemyMaxHeroHp,
  preGame,
  enemyHandCards,
  enemyFieldCards,
  enemyDeck,
  enemyGraveyard,
  enemyCurrentMana,
  turnSecondsRemaining,
  isPlayerTurn,
  draggingCard,
  playerHandCards,
  playerAttackAnimation,
  enemyAttackAnimation,
  enemySpellAnimation,
  onDragOver,
  onDrop,
  onCardHoverEnter,
  onCardHoverLeave,
  onCardClick,
  enemyHeroRef,
  enemyFieldRefs,
  enemyTimerRef,
  isTimerActive,
  enemyTurnTimer,
  hoverTarget,
  dropSuccess,
  attackTargets = [],
  destroyingCards,
  selectionMode,
  selectionConfig,
  applySelection,
}) => {
  // プレイヤー→敵への攻撃アニメーション（プレイヤーフィールドから敵ヒーロー/敵フォロワーへ）
  useEffect(() => {
    if (!playerAttackAnimation) return;
    const { sourceCardId, targetId } = playerAttackAnimation;
    const sourceEl = document.querySelector(`[data-uniqueid="${sourceCardId}"]`) as HTMLElement | null;
    const targetEl = targetId === "hero" ? enemyHeroRef.current : enemyFieldRefs.current[targetId];
    if (!sourceEl || !targetEl) return;
    const start = sourceEl.getBoundingClientRect();
    const end = targetEl.getBoundingClientRect();
    const startX = start.left + start.width / 2;
    const startY = start.top + start.height / 2;
    const endX = end.left + end.width / 2;
    const endY = end.top + end.height / 2;
    const projectile = document.createElement("div");
    projectile.className = styles.enemy_attack_projectile;
    projectile.style.setProperty("--end-x", `${endX - startX}px`);
    projectile.style.setProperty("--end-y", `${endY - startY}px`);
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;
    document.body.appendChild(projectile);
    const t = setTimeout(() => projectile.remove(), 700);
    return () => clearTimeout(t);
  }, [playerAttackAnimation, enemyHeroRef, enemyFieldRefs]);

  const getHpClass = (hp: number) => {
    const ratio = enemyMaxHeroHp > 0 ? hp / enemyMaxHeroHp : 0;
    if (ratio > 0.55) return styles.hpWhite;
    if (ratio > 0.25) return styles.hpYellow;
    return styles.hpRed;
  };

  const enemyHandCount = enemyHandCards.length;
  const enemyMaxAngle = -20;
  const enemyAngleStep = (enemyHandCount > 1) ? (enemyMaxAngle * 2) / (enemyHandCount - 1) : 0;

  // 選択モード中のハイライト判定（selectionService を使用）
  const isHeroSelectable = isEnemyHeroSelectable(selectionMode, selectionConfig);
  const isFieldCardSelectable = isEnemyFieldCardSelectable(selectionMode, selectionConfig);

  return (
    <div className={`${styles.field_enemy} ${enemySpellAnimation ? styles.spell_cast_flash : ""}`}>
      {/* 敵ヒーロー */}
      <div
        ref={enemyHeroRef}
        className={`${styles.field_enemy_hero} ${hoverTarget?.type === 'enemyHero' ? styles.target_highlight : ''} ${dropSuccess?.type === 'enemyHero' ? styles.drop_success : ''} ${attackTargets.includes('hero') ? styles.attack_highlight : ''} ${isHeroSelectable ? styles.selection_highlight : ''}`}
        onDragOver={onDragOver}
        onDrop={() => {
          onDrop("hero");
        }}
        onClick={() => {
          if (isHeroSelectable) {
            applySelection(["hero"]);
          }
        }}
        style={
          enemySpellAnimation?.targetId === "hero"
            ? { animation: "spellTargetFlash 0.6s ease-out" }
            : enemyAttackAnimation?.targetId === "hero"
            ? { animation: "enemyCardAttack 0.9s ease-in-out forwards" }
            : isHeroSelectable ? { cursor: "pointer" } : {}
        }
      >
        <div className={styles.field_enemy_hero_wrap}>
          <div className={styles.field_enemy_hero_hp}>
            {!preGame && <p className={getHpClass(enemyHeroHp)}>{enemyHeroHp}</p>}
          </div>
          {!preGame && <HeroHpBar hp={enemyHeroHp} maxHp={enemyMaxHeroHp} side="enemy" />}
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
          return (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              className={`${isSummoning ? styles.enemy_follower_summon : ""} ${isHovered ? styles.target_highlight : ''} ${isDropped ? styles.drop_success : ''} ${attackTargets.includes(card.uniqueId) ? styles.attack_highlight : ''} ${destroyingCards.has(card.uniqueId) ? styles.card_destroying : ""} ${isFieldCardSelectable ? styles.selection_highlight : ""}`}
              style={{
                ...((card as { isAnimating?: boolean }).isAnimating ? { transform: "translateY(-40px)", opacity: 0 } : {}),
                ...(isAttacking ? { animation: "enemyCardAttack 0.9s ease-in-out forwards" } : {}),
                ...(isSpellTarget ? { animation: "spellTargetFlash 0.6s ease-out" } : {}),
                ...(isFieldCardSelectable ? { cursor: "pointer" } : {}),
              }}
              onDragOver={onDragOver}
              onDrop={() => onDrop(card.uniqueId)}
              isTarget={attackTargets.includes(card.uniqueId)}
              ref={(el: HTMLDivElement | null) => {
                enemyFieldRefs.current[card.uniqueId] = el;
              }}
              onMouseEnter={() => onCardHoverEnter && onCardHoverEnter(card.uniqueId)}
              onMouseLeave={() => onCardHoverLeave && onCardHoverLeave()}
              onClick={() => {
                if (isFieldCardSelectable) {
                  applySelection([card.uniqueId]);
                } else if (onCardClick) {
                  onCardClick(card.uniqueId);
                }
              }}
            />
          );
        })}
      </div>

      {/* 敵手札（裏向き） */}
      <div className={styles.field_enemy_hand_area}>
        {enemyHandCards.reduce((acc, card) => {
          // 同じ uniqueId が既に追加されていないかチェック（重複排除）
          if (acc.some((c) => c.uniqueId === card.uniqueId)) {
            console.warn(`敵手札に重複したカードが検出されました: ${card.name} (${card.uniqueId})`);
            return acc;
          }
          return [...acc, card];
        }, [] as typeof enemyHandCards).map((card, i) => {
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
          <Image src={handIcon} alt="敵手札" priority unoptimized loading="eager" /><span>{enemyHandCards.length}</span>
        </div>
        <div className={styles.field_enemy_status_item}>
          <Image src={deckIcon} alt="敵デッキ" priority unoptimized loading="eager" /><span>{enemyDeck.length}</span>
        </div>
        <div className={styles.field_player_status_item}>
          <Image src={deathIcon} alt="敵墓地" priority unoptimized loading="eager" /><span>{enemyGraveyard.length}</span>
        </div>
      </div>
    </div>
  );
};
