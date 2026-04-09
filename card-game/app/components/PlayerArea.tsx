"use client";

import React, { useRef, useEffect, useContext } from "react";
import CardItem from "./CardItem";
import Image from "next/image";
import type { Card } from "@/app/data/cards";
import type { CostByDaggerPlayStacks } from "@/app/services/synergyUtils";
import type { RuntimeCard, SelectionConfig } from "@/app/types/gameTypes";
import { getEffectiveCost } from "@/app/services/synergyUtils";
import { isOwnHeroSelectable, isOwnFieldCardSelectable } from "@/app/services/selectionService";
import styles from "@/app/assets/css/Game.Master.module.css";
import handIcon from "@/public/img/field/hand-icon.png";
import deckIcon from "@/public/img/field/deck-icon.png";
import deathIcon from "@/public/img/field/void-icon.png";
import HeroHpBar from "./HeroHpBar";
import ViewportContext from "@/app/context/ViewportContext";

interface PlayerAreaProps {
  playerHeroHp: number;
  playerMaxHeroHp: number;
  playerHandCards: Card[];
  playerFieldCards: RuntimeCard[];
  enemyFieldCards: RuntimeCard[];
  playerDeck: Card[];
  playerGraveyard: Card[];
  currentMana: number;
  playerDaggerCount?: number;
  /** 闇夜(23)・夜襲者(28)のコスト軽減スタック（手札にいた状態での暗器打出しの蓄積） */
  playerCostByDaggerStacks?: CostByDaggerPlayStacks;
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
  attackTargets: string[];
  destroyingCards: Set<string>;
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
  // スペル使用
  castSpell: (cardUniqueId: string, targetId: string | "hero", isPlayer?: boolean) => void;
  playCardToField: (card: Card, selectedTargetIds?: string[]) => void;
  initializeSelection: (config: Omit<SelectionConfig, "selectedIds">) => void;
  cancelSelection: () => void;
  // 選択モード
  selectionMode: "none" | "select_target" | "select_hand_card";
  selectionConfig: SelectionConfig | null;
  applySelection: (targetIds: string[]) => void;
  // Ref
  playerHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  playerBattleRef: React.MutableRefObject<HTMLDivElement | null>;
  playerFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  handAreaRef: React.MutableRefObject<HTMLDivElement | null>;
  collapseHand: () => void;
}

export const PlayerArea: React.FC<PlayerAreaProps & { hoverTarget?: { type: string | null; id?: string | null }, dropSuccess?: { type: string | null; id?: string | null } }> = ({
  playerHeroHp,
  playerMaxHeroHp,
  playerHandCards = [],
  playerFieldCards = [],
  enemyFieldCards = [],
  playerDeck = [],
  playerGraveyard = [],
  currentMana,
  playerDaggerCount = 0,
  playerCostByDaggerStacks = { 23: 0, 28: 0 },
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
  destroyingCards,
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
  castSpell,
  playCardToField,
  initializeSelection,
  cancelSelection,
  selectionMode,
  selectionConfig,
  applySelection,
  playerHeroRef,
  playerBattleRef,
  playerFieldRefs,
  handAreaRef,
  collapseHand,
  hoverTarget,
  dropSuccess,
  attackTargets = [],
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
    if (selectionMode === "select_target") return;
    if (!isHandExpanded) {
      setIsHandExpanded(true);
      return;
    }

    const card = playerHandCards.find((c) => c.uniqueId === cardId);
    if (!card) return;

    // クリック時はカード説明表示のみ（ドラッグ&ドロップで発動）
    if (activeHandCardId === cardId) {
      setActiveHandCardId(null);
    } else {
      setActiveHandCardId(cardId);
    }
    onCardClick(cardId);  // カード説明表示用
  };

  const getHpClass = (hp: number) => {
    const ratio = playerMaxHeroHp > 0 ? hp / playerMaxHeroHp : 0;
    if (ratio > 0.55) return styles.hpWhite;
    if (ratio > 0.25) return styles.hpYellow;
    return styles.hpRed;
  };

  // ViewportContext を使用
  const viewport = useContext(ViewportContext);

  // 敵の攻撃アニメーション
  useEffect(() => {
    if (!enemyAttackAnimation) return;

    const targetId = enemyAttackAnimation.targetId;
    let targetElement: HTMLElement | null = null;

    if (targetId === "hero") {
      targetElement = playerHeroRef.current;
    } else {
      targetElement = playerFieldRefs.current[targetId] || null;
    }

    if (!targetElement) {
      console.log('[PlayerArea] Target element not found for attack! (card destroyed):', targetId);
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // 敵フィールドの中央から開始（ViewportContext のスケール・オフセットを適用）
    const startX = viewport.containerLeft + (viewport.containerWidth / 2);
    const startY = viewport.containerTop + (viewport.containerHeight * 0.25);

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
    }, [enemyAttackAnimation, styles, viewport]);

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
          {(() => {
            const isOwnHeroSel = isOwnHeroSelectable(selectionMode, selectionConfig);
            return (
              <div
                ref={playerHeroRef}
                className={`${styles.field_player_hero_hp} ${hoverTarget?.type === 'playerHero' && attackTargets.includes('playerHero') ? styles.attack_highlight : ''} ${isOwnHeroSel ? styles.selection_highlight : ''}`}
                style={isOwnHeroSel ? { cursor: "pointer" } : {}}
                onClick={() => {
                  if (isOwnHeroSel) applySelection(["hero"]);
                }}
              >
                {!preGame && <p className={getHpClass(playerHeroHp)}>{playerHeroHp}</p>}
              </div>
            );
          })()}
          {!preGame && <HeroHpBar hp={playerHeroHp} maxHp={playerMaxHeroHp} side="player" />}
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
        {Array.from({ length: 5 }, (_, index) => {
          const card = playerFieldCards[index];
          if (card) {
            const isDragging = draggingCard === card.uniqueId;
            const isHovered = hoverTarget?.id === card.uniqueId && hoverTarget?.type === 'playerCard';
            const isDropped = dropSuccess?.id === card.uniqueId && dropSuccess?.type === 'playerCard';
            const isSummoning = (card as { isAnimating?: boolean }).isAnimating;
            const isDescSelected = descCardId === card.uniqueId;
            const isOwnFieldSel = isOwnFieldCardSelectable(selectionMode, selectionConfig);
            const isTargetSelectionActive = selectionMode === "select_target";
            return (
              <CardItem
                key={card.uniqueId}
                {...card}
                hp={card.hp ?? 0}
                maxHp={card.maxHp ?? 0}
                attack={card.attack ?? 0}
                baseAttack={(card as any).baseAttack}
                baseHp={(card as any).baseHp}
                draggable={card.canAttack && !isOwnFieldSel && !isTargetSelectionActive}
                onDragStart={(e) => {
                  if (!isPlayerTurn || isOwnFieldSel || isTargetSelectionActive) return;
                  onDragStart(card, e);
                }}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={() => onCardClick(card.uniqueId)}
                isTarget={attackTargets.includes(card.uniqueId)}
                className={`${isSummoning ? styles.enemy_follower_summon : ""} ${isHovered ? styles.target_highlight : ''} ${isDropped ? styles.drop_success : ''} ${attackTargets.includes(card.uniqueId) ? styles.attack_highlight : ''} ${destroyingCards.has(card.uniqueId) ? styles.card_destroying : ""} ${isOwnFieldSel ? styles.selection_highlight : ""} ${isDescSelected ? styles.selection_highlight : ""}`}
                style={{
                  opacity: isDragging ? 0.15 : 1,
                  transition: 'opacity 0.1s ease',
                  ...((card as { isAnimating?: boolean }).isAnimating ? { transform: "translateY(-40px)", opacity: 0 } : {}),
                  ...(isOwnFieldSel ? { cursor: "pointer" } : {}),
                }}
                ref={(el: HTMLDivElement | null) => { playerFieldRefs.current[card.uniqueId] = el; }}
                onClick={() => {
                  if (isOwnFieldSel) {
                    applySelection([card.uniqueId]);
                  } else if (isTargetSelectionActive) {
                    return;
                  } else {
                    onCardClick(card.uniqueId);
                  }
                }}
              />
            );
          } else {
            // 空スロット（フォロワー: 召喚可能 / スペル: 使用可能）
            const draggingHandCard = draggingCard
              ? playerHandCards.find((c) => c.uniqueId === draggingCard)
              : undefined;
            const isHighlight = !!draggingHandCard && (draggingHandCard.type === "follower" || draggingHandCard.type === "spell");
            const hintText = draggingHandCard?.type === "spell" ? "使用可能" : "召喚可能";
            return (
              <div
                key={`empty-${index}`}
                className={`${styles.field_slot} ${isHighlight ? styles.field_slot_highlight : ''}`}
              >
                {isHighlight ? hintText : ""}
              </div>
            );
          }
        })}
      </div>

      {/* プレイヤー手札 */}
      <div
        ref={handAreaRef}
        className={`${styles.field_player_hand_area} ${isHandExpanded ? styles.expanded : ''}`}
      >
        {playerHandCards.reduce((acc, card) => {
          // 同じ uniqueId が既に追加されていないかチェック（重複排除）
          if (acc.some((c) => c.uniqueId === card.uniqueId)) {
            console.warn(`重複したカードが検出されました: ${card.name} (${card.uniqueId})`);
            return acc;
          }
          return [...acc, card];
        }, [] as typeof playerHandCards).map((card) => {
          const isActive = activeHandCardId === card.uniqueId;
          const isDragging = draggingCard === card.uniqueId;
          const sourceId = selectionConfig?.sourceCardId;
          const isHandCardSelectable =
            selectionMode === "select_hand_card" &&
            selectionConfig?.selectableTargets.includes("hand_card") &&
            card.uniqueId !== sourceId;
          return (
            <div
              key={card.uniqueId}
              className={`${styles.field_player_hand_card} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''} ${isHandCardSelectable ? styles.selection_highlight : ''}`}
              onClick={(e) => {
                if (isDragging) return;
                if (selectionMode === "select_target") return;
                e.stopPropagation();
                if (isHandCardSelectable) {
                  applySelection([card.uniqueId]);
                } else if (selectionMode === "select_hand_card") {
                  // 効果元（暗躍・裏取引の商人など）は選択対象外
                  return;
                } else {
                  handleCardClick(card.uniqueId);
                }
              }}
              style={{
                zIndex: isActive ? 4000 : (isDragging ? 950 : 10),
                transition: "all 0.25s ease",
                ...(isHandCardSelectable ? { cursor: "pointer" } : {}),
                ...(selectionMode === "select_hand_card" && card.uniqueId === sourceId
                  ? { opacity: 0.55, cursor: "default" }
                  : {}),
              }}
            >
              {isDragging ? (
                // keep card DOM in place but hide visually to avoid layout shifts that may break touch tracking
                <CardItem
                  {...card}
                  hp={card.hp ?? 0}
                  maxHp={card.maxHp ?? 0}
                  attack={card.attack ?? 0}
                  effectiveCost={getEffectiveCost(
                    card,
                    playerFieldCards.length,
                    playerDaggerCount,
                    playerCostByDaggerStacks
                  )}
                  draggable={selectionMode === "none"}
                  inHand
                  currentMana={currentMana}
                  aria-hidden={true}
                  style={{
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    ...swapIds.includes(card.uniqueId) ? { border: '2px solid limegreen' } : undefined,
                    opacity: 0,
                    transition: 'opacity 0.1s ease',
                  }}
                />
              ) : (
                <CardItem
                  {...card}
                  hp={card.hp ?? 0}
                  maxHp={card.maxHp ?? 0}
                  attack={card.attack ?? 0}
                  effectiveCost={getEffectiveCost(
                    card,
                    playerFieldCards.length,
                    playerDaggerCount,
                    playerCostByDaggerStacks
                  )}
                  draggable={selectionMode === "none"}
                  inHand
                  currentMana={currentMana}
                  onDragStart={(e) => {
                    if (!isPlayerTurn || selectionMode !== "none") return;
                    setDescCardId(null);
                    onDragStart(card, e);
                  }}
                  onDragEnd={onDragEnd}
                  onMouseEnter={() => setDescCardId(card.uniqueId)}
                  onMouseLeave={() => setDescCardId(null)}
                  style={{
                    ...swapIds.includes(card.uniqueId) ? { border: '2px solid limegreen' } : undefined,
                    opacity: isDragging ? 0.3 : 1,
                    transition: 'opacity 0.1s ease',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* プレイヤーステータス */}
      <div className={styles.field_player_status}>
        <div className={styles.field_player_status_item}>
          <Image src={handIcon} alt="プレイヤー手札" unoptimized loading="eager" /><span>{playerHandCards.length}</span>
        </div>
        <div className={styles.field_player_status_item}>
          <Image src={deckIcon} alt="プレイヤーデッキ" unoptimized loading="eager" /><span>{playerDeck.length}</span>
        </div>
        <div className={styles.field_player_status_item}>
          <Image src={deathIcon} alt="墓地" unoptimized loading="eager" /><span>{playerGraveyard.length}</span>
        </div>
      </div>

      {/* カード説明パネル */}
      {(() => {
        const card = descCardId
          ? playerHandCards.find(c => c.uniqueId === descCardId)
            || playerFieldCards.find(c => c.uniqueId === descCardId)
            || enemyFieldCards.find(c => c.uniqueId === descCardId)
          : null;
        if (!card) return null;
        return (
          <div className={styles.field_card_description} aria-hidden={false} data-card-description="true">
            <h4>{card.name}</h4>
            <p>{card.description ?? ""}</p>
            {card.descriptionFormationBonus ? (
              <p className={styles.field_card_description_synergy}>
                <span className={styles.field_card_description_synergy_label_formation}>陣形</span><br />
                {card.descriptionFormationBonus}
              </p>
            ) : null}
            {card.descriptionDaggerSynergy ? (
              <p className={styles.field_card_description_synergy}>
                <span className={styles.field_card_description_synergy_label_dagger}>暗器</span><br />
                {card.descriptionDaggerSynergy}
              </p>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
};
