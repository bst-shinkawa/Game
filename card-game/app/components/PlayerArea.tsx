"use client";

import React, { useRef, useEffect } from "react";
import CardItem from "./CardItem";
import ManaBar from "./ManaBar";
import Image from "next/image";
import type { Card } from "@/app/data/cards";
import styles from "@/app/assets/css/Game.Master.module.css";
import handIcon from "@/public/img/field/hand.png";
import deckIcon from "@/public/img/field/deck.png";
import deathIcon from "@/public/img/field/void.png";
import TimerCircle, { TimerController } from "./TimerCircle";

interface PlayerAreaProps {
  playerHeroHp: number;
  playerHandCards: Card[];
  playerFieldCards: (Card & { maxHp: number; canAttack?: boolean })[];
  playerDeck: Card[];
  playerGraveyard: Card[];
  currentMana: number;
  turnSecondsRemaining: number;
  isPlayerTurn: boolean;
  draggingCard: string | null;
  isHandExpanded: boolean;
  activeHandCardId: string | null;
  swapIds: string[];
  preGame: boolean;
  descCardId: string | null;
  enemyAttackAnimation: { sourceCardId: string | null; targetId: string | "hero" } | null;
  enemySpellAnimation: { targetId: string | "hero"; effect: string } | null;
  // UI状態
  setIsHandExpanded: (expanded: boolean) => void;
  setActiveHandCardId: (id: string | null) => void;
  setDescCardId: (id: string | null) => void;
  setSwapIds: (ids: string[]) => void;
  setDraggingCard: (id: string | null) => void;
  setDragPosition: (pos: { x: number; y: number }) => void;
  setArrowStartPos: (pos: { x: number; y: number } | null) => void;
  // イベント
  onDragStart: (card: Card, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (card: Card | null) => void;
  onPlayerFieldDrop: () => void;
  onCardClick: (cardId: string) => void;
  onCardSwap: (cardId: string) => void;
  // Ref
  playerHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  playerBattleRef: React.MutableRefObject<HTMLDivElement | null>;
  playerFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  handAreaRef: React.MutableRefObject<HTMLDivElement | null>;
  collapseHand: () => void;
  timerRef: React.MutableRefObject<TimerController | null>;
  isTimerActive: boolean;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
  playerHeroHp,
  playerHandCards = [],
  playerFieldCards = [],
  playerDeck = [],
  playerGraveyard = [],
  currentMana,
  turnSecondsRemaining,
  isPlayerTurn,
  draggingCard,
  isHandExpanded,
  activeHandCardId,
  swapIds,
  preGame,
  descCardId,
  enemyAttackAnimation,
  enemySpellAnimation,
  setIsHandExpanded,
  setActiveHandCardId,
  setDescCardId,
  setSwapIds,
  setDraggingCard,
  setDragPosition,
  setArrowStartPos,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onPlayerFieldDrop,
  onCardClick,
  onCardSwap,
  playerHeroRef,
  playerBattleRef,
  playerFieldRefs,
  handAreaRef,
  collapseHand,
  timerRef,
  isTimerActive,
}) => {
  // 手札レイアウト計算
  useEffect(() => {
    if (isHandExpanded || !handAreaRef.current) return;

    const cards = handAreaRef.current.querySelectorAll(`.${styles.field_player_hand_card}`);
    const count = cards.length;
    const maxAngle = 25;
    const angleStep = (count > 1) ? (maxAngle * 2) / (count - 1) : 0;

    cards.forEach((card, i) => {
      const cardEl = card as HTMLDivElement;
      const angle = -maxAngle + angleStep * i;
      const offsetX = (i - (count - 1) / 2) * 32;
      const edgeOffsetY = Math.abs(i - (count - 1) / 2) * 5;

      cardEl.style.setProperty('--rotate', `${angle}deg`);
      cardEl.style.transform = `translateX(${offsetX}px) translateY(${edgeOffsetY}px) rotate(${angle}deg)`;
    });
  }, [playerHandCards.length, isHandExpanded, styles.field_player_hand_card]);

  const handleCardClick = (cardId: string) => {
    if (!isHandExpanded) {
      setIsHandExpanded(true);
      return;
    }

    if (activeHandCardId === cardId) {
      setActiveHandCardId(null);
      setDescCardId(null);
    } else {
      setActiveHandCardId(cardId);
      setDescCardId(cardId);
    }
  };

  const getHpClass = (hp: number) => {
    if (hp === 20) return styles.hpWhite;
    if (hp >= 11) return styles.hpYellow;
    return styles.hpRed;
  };

  // 敵の攻撃アニメーション
  useEffect(() => {
    if (!enemyAttackAnimation) return;

    console.log('[PlayerArea] Enemy attack animation triggered:', enemyAttackAnimation);

    const targetId = enemyAttackAnimation.targetId;
    let targetElement: HTMLElement | null = null;

    if (targetId === "hero") {
      targetElement = playerHeroRef.current;
    } else {
      targetElement = playerFieldRefs.current[targetId] || null;
    }

    console.log('[PlayerArea] Target element:', targetElement, 'targetId:', targetId);

    if (!targetElement) {
      console.warn('[PlayerArea] Target element not found!');
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // 敵フィールドの中央から開始
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight * 0.25;

    console.log('[PlayerArea] Projectile animation:', { startX, startY, targetX, targetY });

    // プロジェクタイルを作成
    const projectile = document.createElement('div');
    projectile.className = styles.enemy_attack_projectile;
    projectile.style.setProperty('--end-x', `${targetX - startX}px`);
    projectile.style.setProperty('--end-y', `${targetY - startY}px`);
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;
    document.body.appendChild(projectile);

    // 150ms 後にターゲット背景をフラッシュ
    const timeout = setTimeout(() => {
      const flash = document.createElement('div');
      flash.className = `${styles.enemy_attack_flash}`;
      flash.style.position = 'absolute';
      flash.style.top = `${targetRect.top}px`;
      flash.style.left = `${targetRect.left}px`;
      flash.style.width = `${targetRect.width}px`;
      flash.style.height = `${targetRect.height}px`;
      flash.style.pointerEvents = 'none';
      flash.style.zIndex = '1000';
      document.body.appendChild(flash);

      // アニメーション完了後に削除
      setTimeout(() => {
        flash.remove();
      }, 300);
    }, 150);

      // クリーンアップ
      return () => {
        clearTimeout(timeout);
        projectile.remove();
      };
    }, [enemyAttackAnimation, styles]);

  // 敵のスペルアニメーション
  useEffect(() => {
    if (!enemySpellAnimation || !playerHeroRef.current) return;

    console.log('[PlayerArea] Enemy spell animation triggered:', enemySpellAnimation);

    const heroRect = playerHeroRef.current.getBoundingClientRect();
    
    // スペルエフェクトフラッシュ
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.top = `${heroRect.top}px`;
    flash.style.left = `${heroRect.left}px`;
    flash.style.width = `${heroRect.width}px`;
    flash.style.height = `${heroRect.height}px`;
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '1000';
    
    // エフェクト種別で色を変更
    const effectColor = 
      enemySpellAnimation.effect === 'damage_all' ? 'rgba(100, 150, 255, 0.6)' :  // 青フラッシュ（全体）
      enemySpellAnimation.effect === 'damage_single' ? 'rgba(255, 150, 0, 0.6)' :  // オレンジフラッシュ（単体）
      'rgba(255, 255, 255, 0.3)';  // 白フラッシュ（その他）
    
    flash.style.backgroundColor = effectColor;
    flash.style.animation = 'spellFlash 0.5s ease-out forwards';
    flash.className = styles.enemy_spell_flash;
    document.body.appendChild(flash);

    setTimeout(() => {
      flash.remove();
    }, 500);
  }, [enemySpellAnimation, styles, playerHeroRef]);  return (
    <div className={styles.field_player}>
      {/* プレイヤーヒーロー */}
      <div className={styles.field_player_hero}>
        <div className={styles.field_player_hero_wrap}>
          <div
            ref={playerHeroRef}
            className={styles.field_player_hero_hp}
            onDragOver={(e) => {
              const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
              const isHeal = handCard && handCard.effect === "heal_single";
              if (draggingCard && isHeal) e.preventDefault();
            }}
            onDrop={() => {
              if (!draggingCard) return;
              const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
              const isHeal = handCard && handCard.effect === "heal_single";
              if (handCard && handCard.type === "spell" && isHeal) {
                onCardClick(draggingCard);
              }
              setDraggingCard(null);
              setArrowStartPos(null);
            }}
          >
            <p className={getHpClass(playerHeroHp)}>{playerHeroHp}</p>
          </div>
        </div>
      </div>

      {/* プレイヤーフィールド */}
      <div
        className={styles.field_player_battle}
        ref={playerBattleRef}
        onDragOver={(e) => {
          const isHandCard = playerHandCards.some((c) => c.uniqueId === draggingCard);
          if (draggingCard && isHandCard) e.preventDefault();
        }}
        onDrop={onPlayerFieldDrop}
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
              if (!isPlayerTurn) return;
              onDragStart(card, e);
            }}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={() => onCardClick(card.uniqueId)}
            style={{
              opacity: draggingCard === card.uniqueId ? 0.3 : 1,
              transition: 'opacity 0.1s ease',
            }}
            ref={(el: HTMLDivElement | null) => { playerFieldRefs.current[card.uniqueId] = el; }}
            onClick={() => onCardClick(card.uniqueId)}
          />
        ))}
      </div>

      {/* プレイヤー手札 */}
      <div
        ref={handAreaRef}
        className={`${styles.field_player_hand_area} ${isHandExpanded ? styles.expanded : ''}`}
      >
        {playerHandCards.map((card) => {
          const isActive = activeHandCardId === card.uniqueId;
          const isDragging = draggingCard === card.uniqueId;
          return (
            <div
              key={card.uniqueId}
              className={`${styles.field_player_hand_card} ${isActive ? styles.active : ''}`}
              onClick={(e) => {
                if (isDragging) return;
                e.stopPropagation();
                handleCardClick(card.uniqueId);
              }}
              style={{ zIndex: isActive ? 4000 : (isDragging ? 950 : 10), transition: 'all 0.25s ease' }}
            >
              <CardItem
                {...card}
                hp={card.hp ?? 0}
                maxHp={card.maxHp ?? 0}
                attack={card.attack ?? 0}
                draggable
                inHand
                currentMana={currentMana}
                onDragStart={(e) => {
                  if (!isPlayerTurn) return;
                  onDragStart(card, e);
                }}
                onDragEnd={onDragEnd}
                style={{
                  ...swapIds.includes(card.uniqueId) ? { border: '2px solid limegreen' } : undefined,
                  opacity: isDragging ? 0.3 : 1,
                  transition: 'opacity 0.1s ease',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* マナバー */}
      <div className={styles.field_player_mana}>
        <ManaBar maxMana={10} currentMana={currentMana} type="player" /> 
        {/* ↑ type="player" を追加 */}
      </div>

      {/* ターンタイマー */}
      <div className={styles.field_player_timer}>
        <TimerCircle 
          ref={timerRef} 
          duration={60} 
          isPlayerTurn={isPlayerTurn} 
          type="player"
          isTimerActive={isTimerActive}
        />
      </div>


      {/* プレイヤーステータス */}
      <div className={styles.field_player_status}>
        <div className={styles.field_player_status_item}>
          <Image src={handIcon} alt="プレイヤー手札" /><span>{playerHandCards.length}</span>
        </div>
        <div className={styles.field_player_status_item}>
          <Image src={deckIcon} alt="プレイヤーデッキ" /><span>{playerDeck.length}</span>
        </div>
        <div className={styles.field_player_status_item}>
          <Image src={deathIcon} alt="墓地" /><span>{playerGraveyard.length}</span>
        </div>
      </div>

      {/* カード説明パネル */}
      {descCardId && (() => {
        const card = playerHandCards.find(c => c.uniqueId === descCardId)
          || playerFieldCards.find(c => c.uniqueId === descCardId);
        return (
          <div className={styles.field_card_description} aria-hidden={false}>
            <h4>{card?.name ?? ""}</h4>
            <p>{card?.description ?? ""}</p>
          </div>
        );
      })()}
    </div>
  );
};
