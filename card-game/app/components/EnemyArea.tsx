"use client";

import React, { useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CardItem from "./CardItem";
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
import HeroHpBar from "./HeroHpBar";
import { FIELD_CARD_POSE, FIELD_SUMMON_FROM } from "@/app/constants/fieldBattleCardMotion";

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
  enemyAttackAnimation: { sourceCardId: string | null; targetId: string | "hero" } | null;
  enemySpellAnimation: { targetId: string | "hero"; effect: string } | null;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (targetId: string | "hero") => void;
  onCardHoverEnter?: (cardId: string) => void;
  onCardHoverLeave?: () => void;
  onCardClick?: (cardId: string) => void;
  enemyHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  enemyFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  destroyingCards: Set<string>;
  reportDestroyVisualComplete: (uniqueId: string) => void;
  // 選択モード
  selectionMode: SelectionMode;
  selectionConfig: SelectionConfig | null;
  applySelection: (targetIds: string[]) => void;
}

export const EnemyArea: React.FC<EnemyAreaProps & { hoverTarget?: { type: string | null; id?: string | null }, dropSuccess?: { type: string | null; id?: string | null }, attackTargets?: string[], descCardId?: string | null }> = ({
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
  enemyAttackAnimation,
  enemySpellAnimation,
  onDragOver,
  onDrop,
  onCardHoverEnter,
  onCardHoverLeave,
  onCardClick,
  enemyHeroRef,
  enemyFieldRefs,
  hoverTarget,
  dropSuccess,
  attackTargets = [],
  descCardId,
  destroyingCards,
  reportDestroyVisualComplete,
  selectionMode,
  selectionConfig,
  applySelection,
}) => {
  const destroyingRef = useRef(destroyingCards);
  destroyingRef.current = destroyingCards;

  const enemyHandAreaRef = useRef<HTMLDivElement | null>(null);
  const enemyDeckPileRef = useRef<HTMLDivElement | null>(null);
  const prevEnemyHandIdsRef = useRef<string[]>([]);
  const prevEnemyDeckCountRef = useRef<number>(enemyDeck.length);
  const enemyAnimationTimeoutsRef = useRef<number[]>([]);
  const [animatingEnemyHandIds, setAnimatingEnemyHandIds] = useState<Set<string>>(new Set());
  const [enemyDrawFlights, setEnemyDrawFlights] = useState<Array<{
    id: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    delay: number;
  }>>([]);

  const getHpClass = (hp: number) => {
    const ratio = enemyMaxHeroHp > 0 ? hp / enemyMaxHeroHp : 0;
    if (ratio > 0.55) return styles.hpWhite;
    if (ratio > 0.25) return styles.hpYellow;
    return styles.hpRed;
  };

  const enemyHandCount = enemyHandCards.length;
  const enemyMaxAngle = -20;
  const enemyAngleStep = (enemyHandCount > 1) ? (enemyMaxAngle * 2) / (enemyHandCount - 1) : 0;

  useEffect(() => {
    return () => {
      enemyAnimationTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      enemyAnimationTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const currentIds = enemyHandCards.map((c) => c.uniqueId);
    const first = prevEnemyHandIdsRef.current.length === 0;
    if (first) {
      prevEnemyHandIdsRef.current = currentIds;
      prevEnemyDeckCountRef.current = enemyDeck.length;
      return;
    }
    if (preGame) {
      prevEnemyHandIdsRef.current = currentIds;
      prevEnemyDeckCountRef.current = enemyDeck.length;
      return;
    }

    const deckDropped = enemyDeck.length < prevEnemyDeckCountRef.current;
    const added = enemyHandCards.filter((c) => !prevEnemyHandIdsRef.current.includes(c.uniqueId));
    prevEnemyHandIdsRef.current = currentIds;
    prevEnemyDeckCountRef.current = enemyDeck.length;
    if (!deckDropped || added.length === 0) return;

    const pileRect = enemyDeckPileRef.current?.getBoundingClientRect();
    if (!pileRect) return;

    const flights = added
      .map((card, index) => {
        const target = enemyHandAreaRef.current?.querySelector(`[data-enemy-hand-id="${card.uniqueId}"]`) as HTMLElement | null;
        if (!target) return null;
        const targetRect = target.getBoundingClientRect();
        return {
          id: card.uniqueId,
          fromX: pileRect.left + pileRect.width / 2 - 35,
          fromY: pileRect.top + pileRect.height / 2 - 50,
          toX: targetRect.left,
          toY: targetRect.top,
          delay: index * 0.07,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (flights.length === 0) return;

    const ids = flights.map((f) => f.id);
    setAnimatingEnemyHandIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setEnemyDrawFlights((prev) => [...prev, ...flights]);

    flights.forEach((flight, i) => {
      const timerId = window.setTimeout(() => {
        setEnemyDrawFlights((prev) => prev.filter((f) => f.id !== flight.id));
        setAnimatingEnemyHandIds((prev) => {
          const next = new Set(prev);
          next.delete(flight.id);
          return next;
        });
      }, 500 + i * 70);
      enemyAnimationTimeoutsRef.current.push(timerId);
    });
  }, [enemyHandCards, enemyDeck.length, preGame]);

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
          const isDescSelected = descCardId === card.uniqueId;
          const isDestroying = destroyingCards.has(card.uniqueId);
          return (
            <motion.div
              key={card.uniqueId}
              layout={false}
              initial={
                isSummoning
                  ? { ...FIELD_SUMMON_FROM }
                  : false
              }
              animate={
                isDestroying
                  ? {
                      ...FIELD_CARD_POSE,
                      opacity: 0,
                      scale: 0.2,
                      filter: "brightness(0.5)",
                    }
                  : isSummoning
                    ? {
                        ...FIELD_CARD_POSE,
                        opacity: 1,
                      }
                    : {
                        ...FIELD_CARD_POSE,
                        opacity: 1,
                      }
              }
              transition={
                isDestroying
                  ? { duration: 0.45, ease: "easeOut" }
                  : isSummoning
                    ? { duration: 1.04, ease: [0.18, 0.72, 0.3, 1] }
                    : { duration: 0.2, ease: "easeOut" }
              }
              onAnimationComplete={() => {
                if (destroyingRef.current.has(card.uniqueId)) {
                  reportDestroyVisualComplete(card.uniqueId);
                }
              }}
              style={{ display: "inline-block", transformStyle: "preserve-3d" }}
            >
              <CardItem
                {...card}
                fieldTiltOnParent
                hp={card.hp ?? 0}
                maxHp={card.maxHp ?? 0}
                attack={card.attack ?? 0}
                className={`${isHovered ? styles.target_highlight : ""} ${isDropped ? styles.drop_success : ""} ${attackTargets.includes(card.uniqueId) ? styles.attack_highlight : ""} ${isFieldCardSelectable ? styles.selection_highlight : ""} ${isDescSelected ? styles.selection_highlight : ""}`}
                style={{
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
            </motion.div>
          );
        })}
      </div>

      {/* 敵手札（裏向き） */}
      <div className={styles.field_enemy_hand_area} ref={enemyHandAreaRef}>
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
              data-enemy-hand-id={card.uniqueId}
              className={styles.card_back}
              aria-hidden={true}
              style={{
                ...style,
                backgroundImage: `url(${cardBack.src})`,
                visibility: animatingEnemyHandIds.has(card.uniqueId) ? "hidden" : "visible",
              }}
            />
          );
        })}
      </div>

      <div className={styles.field_enemy_deck_pile} ref={enemyDeckPileRef} aria-hidden={true}>
        <div className={styles.field_enemy_deck_pile_layer_1} style={{ backgroundImage: `url(${cardBack.src})` }} />
        <div className={styles.field_enemy_deck_pile_layer_2} style={{ backgroundImage: `url(${cardBack.src})` }} />
        <div className={styles.field_enemy_deck_pile_layer_3} style={{ backgroundImage: `url(${cardBack.src})` }} />
      </div>

      <AnimatePresence>
        {enemyDrawFlights.map((flight) => (
          <motion.div
            key={`enemy-draw-flight-${flight.id}`}
            className={styles.draw_flight}
            initial={{ x: flight.fromX, y: flight.fromY, scale: 0.78, rotate: 12, opacity: 0.98 }}
            animate={{ x: flight.toX, y: flight.toY, scale: 1, rotate: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.46, delay: flight.delay, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.card_back} style={{ backgroundImage: `url(${cardBack.src})`, marginLeft: 0, transform: "none" }} />
          </motion.div>
        ))}
      </AnimatePresence>

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
