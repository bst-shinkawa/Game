"use client";

import React, { useEffect, useRef, useContext, useMemo, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { TurnTimer } from "@/app/data/turnTimer";
import { DamageFloater } from "./DamageFloater";
import { EnemyArea } from "./EnemyArea";
import { PlayerArea } from "./PlayerArea";
import CardItem from "./CardItem";
import { PreGame } from "./PreGame";
import GameOver from "./GameOver";
import Toast from "./Toast";
import ActionLog from "./ActionLog";
import EnemyCardReveal from "./EnemyCardReveal";
import type { ToastItem } from "@/app/hooks/useToast";
import type { ActionLogEntry } from "@/app/hooks/useActionLog";
import type { CardRevealState } from "@/app/types/gameTypes";
import type { EnemySpellHistoryEntry } from "@/app/types/gameTypes";
import Image from "next/image";
import { motion } from "framer-motion";
import { handleSpellUsage } from "@/app/services/spellUsageService";
import type { Card } from "@/app/data/cards";
import type { DamageFloat } from "@/app/hooks/useGameUI";
import type { CostByDaggerPlayStacks } from "@/app/services/synergyUtils";
import type { RuntimeCard, SelectionMode, SelectionConfig } from "@/app/types/gameTypes";
import styles from "@/app/assets/css/Game.Master.module.css";
import ViewportContext from "@/app/context/ViewportContext";
import { KING_SPECIAL_WIN_STREAK_TURNS } from "@/app/constants/gameConstants";

import { useDragHandler } from "@/app/hooks/useDragHandler";
import { useArrowCanvas } from "@/app/hooks/useArrowCanvas";
import { useDamageMonitor } from "@/app/hooks/useDamageMonitor";
import { useAttackClone } from "@/app/hooks/useAttackClone";

interface GameFieldProps {
  playerHandCards: Card[];
  playerFieldCards: RuntimeCard[];
  playerHeroHp: number;
  playerMaxHeroHp: number;
  enemyHandCards: Card[];
  enemyFieldCards: RuntimeCard[];
  enemyHeroHp: number;
  enemyMaxHeroHp: number;
  playerGraveyard: Card[];
  enemyGraveyard: Card[];
  deck: Card[];
  enemyDeck: Card[];
  currentMana: number;
  maxMana: number;
  enemyCurrentMana: number;
  enemyMaxMana: number;
  turn: number;
  turnSecondsRemaining: number;
  gameOver: { over: boolean; winner: null | "player" | "enemy"; reason?: string };
  playerRole?: "king" | "usurper" | null;
  kingBoardControlStreak: number;
  round?: number;
  playerDaggerCount?: number;
  playerCostByDaggerStacks?: CostByDaggerPlayStacks;
  enemyDaggerCount?: number;
  preGame: boolean;
  coinResult: "deciding" | "player" | "enemy";
  aiRunning: boolean;
  destroyingCards: Set<string>;
  reportDestroyVisualComplete: (uniqueId: string) => void;
  toasts: ToastItem[];
  actionLogEntries: ActionLogEntry[];
  enemySpellHistory: EnemySpellHistoryEntry[];
  cardReveal: CardRevealState | null;
  clearCardReveal: () => void;
  damageFloats: DamageFloat[];
  draggingCard: string | null;
  dragPosition: { x: number; y: number };
  isHandExpanded: boolean;
  activeHandCardId: string | null;
  showTurnModal: boolean;
  descCardId: string | null;
  rouletteRunning: boolean;
  rouletteLabel: string;
  showCoinPopup: boolean;
  mulliganTimer: number;
  swapIds: string[];
  showGameStart: boolean;
  attackClone: any;
  movingAttack: { attackerId: string; targetId: string | "hero" } | null;
  playerAttackAnimation: { sourceCardId: string; targetId: string | "hero" } | null;
  enemyAttackAnimation: { sourceCardId: string | null; targetId: string | "hero" } | null;
  enemySpellAnimation: { targetId: string | "hero"; effect: string } | null;
  selectionMode: SelectionMode;
  selectionConfig: SelectionConfig | null;
  playCardToField: (card: Card, selectedTargetIds?: string[]) => void;
  endTurn: () => void;
  attack: (attackerId: string, targetId: string | "hero", isPlayerAttacker?: boolean) => void;
  castSpell: (cardUniqueId: string, targetId: string | "hero", isPlayer?: boolean, setAttackTargets?: (targets: string[]) => void) => void;
  resetGame: (mode: "cpu" | "pvp") => void;
  goToMenu?: () => void;
  finalizeCoin: (winner: "player" | "enemy") => void;
  doMulligan: (keepIds: string[]) => void;
  startMatch: () => void;
  initializeSelection: (config: Omit<SelectionConfig, "selectedIds">) => void;
  applySelection: (targetIds: string[]) => void;
  cancelSelection: () => void;
  setDamageFloats: (floats: DamageFloat[]) => void;
  setDraggingCard: (id: string | null) => void;
  setDragPosition: (pos: { x: number; y: number }) => void;
  setArrowStartPos: (pos: { x: number; y: number } | null) => void;
  setIsHandExpanded: (expanded: boolean) => void;
  setActiveHandCardId: (id: string | null) => void;
  setShowTurnModal: (show: boolean) => void;
  setPauseTimer: (pause: boolean) => void;
  setDescCardId: (id: string | null) => void;
  setRouletteRunning: (running: boolean) => void;
  setRouletteLabel: (label: string) => void;
  setShowCoinPopup: (show: boolean) => void;
  setMulliganTimer: (timer: number) => void;
  setSwapIds: (ids: string[]) => void;
  setShowGameStart: (show: boolean) => void;
  setAttackClone: (clone: any) => void;
  playerTurnTimer?: TurnTimer | null;
  enemyTurnTimer?: TurnTimer | null;
  playerBattleRef: React.MutableRefObject<HTMLDivElement | null>;
  handAreaRef: React.MutableRefObject<HTMLDivElement | null>;
  collapseHand: () => void;
}

export const GameField: React.FC<GameFieldProps> = (props) => {
  const [isEnemySpellHistoryOpen, setIsEnemySpellHistoryOpen] = useState(false);
  const {
    playerHandCards, playerFieldCards, playerHeroHp, playerMaxHeroHp,
    enemyHandCards, enemyFieldCards, enemyHeroHp, enemyMaxHeroHp,
    playerGraveyard, enemyGraveyard, deck, enemyDeck,
    currentMana, maxMana, enemyCurrentMana, enemyMaxMana, turn, turnSecondsRemaining,
    gameOver, playerRole, kingBoardControlStreak, round, playerDaggerCount, playerCostByDaggerStacks, preGame, coinResult, aiRunning, destroyingCards, reportDestroyVisualComplete,
    toasts, actionLogEntries, enemySpellHistory, cardReveal, clearCardReveal,
    damageFloats, draggingCard, dragPosition,
    isHandExpanded, activeHandCardId, showTurnModal,
    descCardId, rouletteRunning, rouletteLabel,
    showCoinPopup, mulliganTimer, swapIds, showGameStart,
    attackClone, movingAttack, playerAttackAnimation,
    enemyAttackAnimation, enemySpellAnimation,
    selectionMode, selectionConfig,
    playCardToField, endTurn, attack, castSpell,
    resetGame, goToMenu, finalizeCoin, doMulligan, startMatch,
    initializeSelection, applySelection, cancelSelection,
    setDamageFloats, setDraggingCard, setDragPosition,
    setIsHandExpanded, setActiveHandCardId, setShowTurnModal,
    setPauseTimer, setDescCardId,
    setRouletteRunning, setRouletteLabel, setShowCoinPopup,
    setMulliganTimer, setSwapIds, setShowGameStart,
    setAttackClone,
    playerTurnTimer, enemyTurnTimer,
    playerBattleRef, handAreaRef, collapseHand,
  } = props;

  // --- Refs ---
  const enemyHeroRef = useRef<HTMLDivElement | null>(null);
  const enemyFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const playerHeroRef = useRef<HTMLDivElement | null>(null);
  const playerFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const viewport = useContext(ViewportContext);
  const isPlayerTurn = turn % 2 === 1;
  const isTimeCritical = isPlayerTurn && turnSecondsRemaining <= 20;
  const timerProgress = Math.max(0, Math.min(1, turnSecondsRemaining / 60));
  const isTargetSelectionActive = selectionMode === "select_target";
  // 表示上のマナ上限は「YOUR TURN / ENEMY TURN モーダル表示開始時」に更新する
  const [displayPlayerMaxMana, setDisplayPlayerMaxMana] = useState(maxMana);
  const [displayEnemyMaxMana, setDisplayEnemyMaxMana] = useState(enemyMaxMana);
  useEffect(() => {
    if (preGame) {
      // プリゲーム遷移時の表示リセット
      setDisplayPlayerMaxMana(maxMana);
      setDisplayEnemyMaxMana(enemyMaxMana);
    }
  }, [preGame, maxMana, enemyMaxMana]);
  const displayPlayerCurrentMana = Math.min(currentMana, displayPlayerMaxMana);
  const displayEnemyCurrentMana = Math.min(enemyCurrentMana, displayEnemyMaxMana);

  // --- Memoized action objects (stable refs for hooks) ---
  const dragRefs = useMemo(() => ({ enemyHeroRef, playerHeroRef, playerBattleRef }), [playerBattleRef]);

  // 二重発火防止: pointer/touch イベントと HTML5 drag イベントが同時に発火するのを防ぐ
  const lastDropTimeRef = useRef(0);

  // スペル・フォロワーを問わず「カードをプレイする」唯一の正規ルート。
  // cardId を引数で受け取ることで、stale closure を回避する。
  // cleanup（setDraggingCard(null) など）は呼び出し側が行う。
  const onPlayerFieldDropCallback = useCallback((cardId: string) => {
    const now = Date.now();
    if (now - lastDropTimeRef.current < 150) return; // 二重発火ガード
    lastDropTimeRef.current = now;

    const card = playerHandCards.find((c) => c.uniqueId === cardId);
    if (!card) return;

    if (card.type === "spell") {
      const usageType = (card as any).usageType;
      if (usageType === "cast_spell_select_target") {
        const selectableTargets = (card as any).selectableTargets || ["hero", "field_card"];
        const selectCount = (card as any).selectCount || 1;
        initializeSelection({
          sourceCardId: cardId, selectableTargets, selectCount,
          onComplete: (selectedIds: string[]) => { if (selectedIds.length > 0) castSpell(cardId, selectedIds[0], true); },
          onCancel: () => {},
        });
      } else if (usageType === "cast_spell_select_hand") {
        const selectableTargets = (card as any).selectableTargets || ["hand_card"];
        const selectCount = (card as any).selectCount || 1;
        initializeSelection({
          sourceCardId: cardId, selectableTargets, selectCount,
          onComplete: (selectedIds: string[]) => {
            if (selectedIds.length > 0) castSpell(cardId, selectedIds[0], true);
          },
          onCancel: () => {},
        });
      } else {
        castSpell(cardId, "hero", true);
      }
    } else if (card.type === "follower") {
      const summonSelectableTargets = (card as any).summonSelectableTargets;
      if (summonSelectableTargets?.length > 0) {
        initializeSelection({
          sourceCardId: cardId, selectableTargets: summonSelectableTargets, selectCount: 1,
          onComplete: (selectedIds: string[]) => playCardToField(card, selectedIds),
          onCancel: () => {},
        });
      } else {
        playCardToField(card);
      }
    }
  }, [playerHandCards, castSpell, playCardToField, initializeSelection]);

  // HTML5 drag イベント（PlayerArea の onDrop）用ラッパー。
  // こちらは draggingCard state が確実に存在するタイミングで呼ばれるため state を使用可。
  const onPlayerFieldDropHTMLDrag = useCallback(() => {
    if (selectionMode === "select_target" || selectionMode === "select_hand_card") return;
    if (!draggingCard) return;

    if (preGame && coinResult !== "deciding") {
      setSwapIds(swapIds.includes(draggingCard) ? swapIds.filter((id) => id !== draggingCard) : [...swapIds, draggingCard]);
      setDraggingCard(null);
      return;
    }

    onPlayerFieldDropCallback(draggingCard);
    setDraggingCard(null);
  }, [draggingCard, preGame, coinResult, selectionMode, swapIds, setDraggingCard, setSwapIds, onPlayerFieldDropCallback]);

  const dragActions = useMemo(() => ({
    attack,
    setSwapIds: setSwapIds as React.Dispatch<React.SetStateAction<string[]>>,
    onPlayerFieldDrop: onPlayerFieldDropCallback,
  }), [attack, setSwapIds, onPlayerFieldDropCallback]);

  // --- Custom hooks ---
  const {
    hoverTarget, dropSuccess, setDropSuccess,
    attackTargets, setAttackTargets, lastAttackTargetsRef,
    arrowStartPos, dragOffsetRef, clientToDesign,
  } = useDragHandler({
    playerHandCards, playerFieldCards, enemyFieldCards,
    isPlayerTurn, preGame, coinResult, swapIds,
    selectionMode,
    draggingCard, setDraggingCard, setDragPosition,
    refs: dragRefs, actions: dragActions,
  });

  const { canvasRef, setArrowProgress } = useArrowCanvas({
    draggingCard, dragPosition, playerHandCards, playerFieldCards, enemyFieldCards,
    hoverTarget, arrowStartPos, enemyHeroRef, playerHeroRef,
    playerFieldRefs, enemyFieldRefs, attackTargets, setAttackTargets,
    lastAttackTargetsRef,
  });

  useDamageMonitor({
    preGame,
    playerHeroHp, enemyHeroHp, playerFieldCards, enemyFieldCards,
    damageFloats, setDamageFloats,
    playerHeroRef, enemyHeroRef, playerFieldRefs, enemyFieldRefs,
  });

  useAttackClone({
    movingAttack,
    playerAttackAnimation,
    enemyFieldCards,
    playerFieldCards,
    enemyFieldRefs,
    playerFieldRefs,
    playerHeroRef,
    enemyHeroRef,
    setAttackClone,
  });

  // --- Turn modal ---
  useEffect(() => {
    if (preGame || showGameStart) { setShowTurnModal(false); return; }
    // モーダル表示と同時に、そのターンの表示マナ上限を確定させる
    setDisplayPlayerMaxMana(maxMana);
    setDisplayEnemyMaxMana(enemyMaxMana);
    setShowTurnModal(true);
    const duration = isPlayerTurn ? 2000 : 1200;
    const t = setTimeout(() => setShowTurnModal(false), duration);
    return () => { clearTimeout(t); setShowTurnModal(false); };
  }, [isPlayerTurn, turn, preGame, showGameStart, maxMana, enemyMaxMana, setShowTurnModal]);

  // --- Mulligan timer ---
  useEffect(() => {
    if (!preGame || coinResult === "deciding" || showCoinPopup) return;
    if (mulliganTimer <= 0) {
      startMatch();
      setShowGameStart(true);
      setTimeout(() => setShowGameStart(false), 1400);
      return;
    }
    const timer = setTimeout(() => setMulliganTimer(mulliganTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [preGame, coinResult, showCoinPopup, mulliganTimer, setMulliganTimer, startMatch, setShowGameStart]);

  // コイントス演出開始前に結果を先に確定し、表示と最終結果を一致させる
  useEffect(() => {
    if (!preGame || coinResult !== "deciding") return;
    if (rouletteLabel === "player" || rouletteLabel === "enemy") return;
    const winner = Math.random() < 0.5 ? "player" : "enemy";
    setRouletteLabel(winner);
  }, [preGame, coinResult, rouletteLabel, setRouletteLabel]);

  // --- Video playback rate ---
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.75;
  }, []);

  const isLocal = process.env.NODE_ENV !== "production";
  const basePath = process.env.NODE_ENV === "production" ? "/Game" : "";

  // --- Render ---
  return (
    <div className={`${styles.field} ${isLocal ? styles.field_local : ""}`}>
      <div className={styles.field_bg}>
        <video ref={videoRef} src={`${basePath}/img/field/bg.mp4`} autoPlay muted loop playsInline />
      </div>

      {typeof document !== "undefined" && createPortal(<DamageFloater floats={damageFloats} />, document.body)}

      {preGame && (
        <PreGame
          coinResult={coinResult}
          showCoinPopup={showCoinPopup}
          rouletteRunning={rouletteRunning}
          rouletteLabel={rouletteLabel}
          playerHandCards={playerHandCards}
          currentMana={currentMana}
          mulliganTimer={mulliganTimer}
          swapIds={swapIds}
          descCardId={descCardId}
          onRouletteAnimEnd={() => {
            setTimeout(() => {
              const winner = rouletteLabel === "enemy" ? "enemy" : "player";
              finalizeCoin(winner);
              setRouletteRunning(false);
              setShowCoinPopup(true);
              setTimeout(() => setShowCoinPopup(false), 2000);
            }, 100);
          }}
          onSwapToggle={(cardId: string) => {
            setSwapIds(swapIds.includes(cardId) ? swapIds.filter((id) => id !== cardId) : [...swapIds, cardId]);
          }}
          onMulliganSubmit={() => {
            const keep = playerHandCards.filter((c) => !swapIds.includes(c.uniqueId)).map((c) => c.uniqueId);
            doMulligan(keep);
            setSwapIds([]);
            setShowCoinPopup(false);
            setTimeout(() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  startMatch();
                  setShowGameStart(true);
                  setTimeout(() => setShowGameStart(false), 1400);
                });
              });
            }, 2000);
          }}
          onMulliganSkip={() => {
            startMatch();
            setShowGameStart(true);
            setTimeout(() => setShowGameStart(false), 1400);
          }}
          onPreGameCardHover={(cardId) => setDescCardId(cardId)}
          setRouletteRunning={setRouletteRunning}
          setSwapIds={setSwapIds}
        />
      )}

      <canvas ref={canvasRef} style={{ position: "fixed", left: 0, top: 0, pointerEvents: "none", zIndex: 900 }} />

      {/* Drag clone */}
      {draggingCard &&
        (() => {
          const card = playerHandCards.find((c) => c.uniqueId === draggingCard) || playerFieldCards.find((c) => c.uniqueId === draggingCard);
          if (!card) return null;
          const cardWidth = 70;
          const cardHeight = 100;
          const s = viewport?.scale ?? 1;
          const displayW = Math.max(28, Math.round(cardWidth * s));
          const displayH = Math.max(40, Math.round(cardHeight * s));
          return createPortal(
            <div
              style={{
                position: "fixed", left: dragPosition.x, top: dragPosition.y,
                width: displayW, height: displayH, zIndex: 1600,
                pointerEvents: "none", opacity: 0.98,
                transform: "scale(1.12)", transition: "transform 120ms ease",
              }}
              data-drag-id={draggingCard}
              className={styles.drag_clone}
            >
              <CardItem
                {...card}
                hp={card.hp ?? 0} maxHp={card.maxHp ?? 0} attack={card.attack ?? 0}
                className={styles.drag_clone_card}
                style={{ width: displayW, height: displayH, paddingTop: 0 }}
              />
            </div>,
            document.body
          );
        })()}

      {/* 攻撃クローン（敵AI / プレイヤー） */}
      {typeof document !== "undefined" &&
        attackClone &&
        createPortal(
          (() => {
            const { start, end, card, duration } = attackClone;
            const deltaX = end.left - start.left;
            const deltaY = end.top - start.top;
            return (
              <motion.div
                key={attackClone.key}
                className={styles.card}
                style={{
                  position: "fixed",
                  left: start.left,
                  top: start.top,
                  width: start.width,
                  height: start.height,
                  zIndex: 980,
                  pointerEvents: "none",
                }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: deltaX, y: deltaY, opacity: 0.95 }}
                transition={{ duration: duration / 1000, ease: "easeInOut" }}
                onAnimationComplete={() => setAttackClone(null)}
              >
                {card.image && <Image src={card.image} alt={card.name} width={100} height={100} priority unoptimized />}
                <div className={styles.card_hp}><p>{Math.min(card.hp ?? 0, card.maxHp ?? 0)}</p></div>
                <div className={styles.card_attack}><p>{card.attack ?? 0}</p></div>
              </motion.div>
            );
          })(),
          document.body
        )}

      {/* Turn modal */}
      {showTurnModal && (
        <div className={styles.overlayModal}>
          <div className={`${styles.overlayModalInner} ${styles.overlayModalInnerTurn}`}>
            <h1 className={styles.overlayModalTitleTurn}>{isPlayerTurn ? "Your Turn" : "Enemy Turn"}</h1>
          </div>
        </div>
      )}

      {/* GameStart overlay */}
      {showGameStart && (
        <div className={styles.overlayModal}>
          <div className={`${styles.overlayModalInner} ${styles.overlayModalInnerGameStart}`}>
            <h1 className={styles.overlayModalTitleGameStart}>GameStart</h1>
          </div>
        </div>
      )}

      {/* Enemy area */}
      <EnemyArea
        enemyHeroHp={enemyHeroHp}
        enemyMaxHeroHp={enemyMaxHeroHp}
        preGame={preGame}
        enemyHandCards={preGame ? [] : enemyHandCards}
        enemyFieldCards={enemyFieldCards}
        enemyDeck={enemyDeck}
        enemyGraveyard={enemyGraveyard}
        enemyCurrentMana={enemyCurrentMana}
        turnSecondsRemaining={turnSecondsRemaining}
        isPlayerTurn={isPlayerTurn}
        draggingCard={draggingCard}
        playerHandCards={playerHandCards}
        enemyAttackAnimation={enemyAttackAnimation}
        enemySpellAnimation={enemySpellAnimation}
        hoverTarget={hoverTarget}
        dropSuccess={dropSuccess}
        attackTargets={attackTargets}
        descCardId={descCardId}
        destroyingCards={destroyingCards}
        reportDestroyVisualComplete={reportDestroyVisualComplete}
        onDragOver={(e) => {
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const isHeal = handCard && handCard.effect === "heal_single";
          if (draggingCard && (!isHeal || !handCard)) e.preventDefault();
        }}
        onDrop={(targetId) => {
          if (!draggingCard) return;
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const keepExpandedForDagger = !!(handCard && handCard.type === "spell" && handCard.id === 15);
          if (handCard && handCard.type === "spell") {
            const selectableTargets = (handCard as any).selectableTargets as ("hero" | "field_card")[] | undefined;
            const canTargetHero = !selectableTargets || selectableTargets.includes("hero");
            const canTargetField = !selectableTargets || selectableTargets.includes("field_card");
            if ((targetId === "hero" && !canTargetHero) || (targetId !== "hero" && !canTargetField)) {
              setDraggingCard(null);
              arrowStartPos.current = null;
              dragOffsetRef.current = { x: 0, y: 0 };
              setAttackTargets([]);
              return;
            }
            setAttackTargets([]);
            castSpell(draggingCard, targetId, true, setAttackTargets);
          } else {
            attack(draggingCard, targetId, true);
          }
          setDraggingCard(null);
          arrowStartPos.current = null;
          dragOffsetRef.current = { x: 0, y: 0 };
          if (targetId === "hero") setDropSuccess({ type: "enemyHero" });
          else setDropSuccess({ type: "enemyCard", id: targetId });
          setAttackTargets([]);
          setTimeout(() => setDropSuccess({ type: null }), 500);
          if (keepExpandedForDagger) {
            // pointerup 後に発火する click の「外側クリックで閉じる」より後で再展開する
            // （0ms だと競合して閉じるケースがあるため少し遅らせる）
            setTimeout(() => setIsHandExpanded(true), 120);
          }
        }}
        onCardClick={(cardId: string) => setDescCardId(descCardId === cardId ? null : cardId)}
        enemyHeroRef={enemyHeroRef}
        enemyFieldRefs={enemyFieldRefs}
        selectionMode={selectionMode}
        selectionConfig={selectionConfig}
        applySelection={applySelection}
      />

      {/* Player area */}
      <PlayerArea
        playerHeroHp={playerHeroHp}
        playerMaxHeroHp={playerMaxHeroHp}
        playerHandCards={preGame ? [] : playerHandCards}
        playerFieldCards={playerFieldCards}
        enemyFieldCards={enemyFieldCards}
        playerDeck={deck}
        playerGraveyard={playerGraveyard}
        currentMana={currentMana}
        playerDaggerCount={playerDaggerCount}
        playerCostByDaggerStacks={playerCostByDaggerStacks}
        turnSecondsRemaining={turnSecondsRemaining}
        isPlayerTurn={isPlayerTurn}
        draggingCard={draggingCard}
        isHandExpanded={isHandExpanded}
        activeHandCardId={activeHandCardId}
        swapIds={swapIds}
        preGame={preGame}
        descCardId={descCardId}
        enemyAttackAnimation={enemyAttackAnimation}
        enemySpellAnimation={enemySpellAnimation}
        attackTargets={attackTargets}
        destroyingCards={destroyingCards}
        reportDestroyVisualComplete={reportDestroyVisualComplete}
        setIsHandExpanded={setIsHandExpanded}
        setActiveHandCardId={setActiveHandCardId}
        setDescCardId={setDescCardId}
        setSwapIds={setSwapIds}
        setDraggingCard={setDraggingCard}
        setDragPosition={setDragPosition}
        setArrowStartPos={(pos) => { arrowStartPos.current = pos; }}
        onDragStart={(card, e) => {
          if (!isPlayerTurn) return;
          setArrowProgress(0);
          try {
            e.dataTransfer?.setData("text/plain", card.uniqueId);
            e.dataTransfer?.setDragImage(new window.Image(), 0, 0);
          } catch {}
          const rect = e.currentTarget.getBoundingClientRect();
          const offset = { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top };
          dragOffsetRef.current = offset;
          setDraggingCard(card.uniqueId);
          arrowStartPos.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          setDragPosition({ x: (e as any).clientX - offset.x, y: (e as any).clientY - offset.y });
        }}
        onDragEnd={() => {
          setDraggingCard(null);
          arrowStartPos.current = null;
          dragOffsetRef.current = { x: 0, y: 0 };
          setAttackTargets([]);
        }}
        onDragOver={(_e) => {}}
        onDrop={() => {}}
        onPlayerFieldDrop={onPlayerFieldDropHTMLDrag}
        onCardClick={(cardId: string) => setDescCardId(descCardId === cardId ? null : cardId)}
        onCardSwap={(cardId: string) => {
          setSwapIds(swapIds.includes(cardId) ? swapIds.filter((id) => id !== cardId) : [...swapIds, cardId]);
        }}
        castSpell={castSpell}
        playCardToField={playCardToField}
        initializeSelection={initializeSelection}
        cancelSelection={cancelSelection}
        playerHeroRef={playerHeroRef}
        playerBattleRef={playerBattleRef}
        playerFieldRefs={playerFieldRefs}
        handAreaRef={handAreaRef}
        collapseHand={collapseHand}
        hoverTarget={hoverTarget}
        dropSuccess={dropSuccess}
        selectionMode={selectionMode}
        selectionConfig={selectionConfig}
        applySelection={applySelection}
      />

      {/* Turn End button */}
      <div className={styles.field_turn_wrapper} data-keep-hand-open="true">
        <div className={styles.field_turn}>
          <div className={`${styles.field_turn_mana_badge} ${styles.field_turn_mana_badge_enemy}`}>
            {displayEnemyCurrentMana}/{displayEnemyMaxMana}
          </div>
          <svg className={`${styles.field_turn_outline} ${isTimeCritical ? styles.field_turn_outline_critical : ""}`} viewBox="0 0 200 84" aria-hidden="true">
            <rect className={styles.field_turn_outline_track} x="4" y="4" width="192" height="76" rx="38" ry="38" />
            <rect
              className={styles.field_turn_outline_progress}
              x="4"
              y="4"
              width="192"
              height="76"
              rx="38"
              ry="38"
              pathLength={100}
              strokeDasharray={`${timerProgress * 100} 100`}
            />
          </svg>
          <button
            onClick={() => endTurn()}
            disabled={!isPlayerTurn || aiRunning || preGame || showGameStart || gameOver.over || isTargetSelectionActive}
            className={isTimeCritical ? styles.field_turn_end_critical : ""}
            title={
              preGame ? "ゲーム開始前です" :
              isTargetSelectionActive ? "対象選択を完了またはキャンセルしてください" :
              showTurnModal ? "ターン切替処理中です" :
              !isPlayerTurn ? "相手のターンです" : "ターンを終了します"
            }
          >
            <span className={styles.field_turn_text}>TURN END</span>
          </button>
          <div className={`${styles.field_turn_mana_badge} ${styles.field_turn_mana_badge_player}`}>
            {displayPlayerCurrentMana}/{displayPlayerMaxMana}
          </div>
        </div>
      </div>

      <Toast toasts={toasts} />
      {isTargetSelectionActive && (
        <div className={styles.selection_lock_notice} data-keep-hand-open="true">
          <span>対象を選択してください</span>
          <button type="button" onClick={() => cancelSelection()}>キャンセル</button>
        </div>
      )}
      <ActionLog entries={actionLogEntries} />
      {!preGame && (
        <>
          <button
            type="button"
            className={`${styles.enemy_spell_history_menu_button} ${isEnemySpellHistoryOpen ? styles.enemy_spell_history_menu_button_open : ""}`}
            onClick={() => setIsEnemySpellHistoryOpen((v) => !v)}
            title="敵スペル履歴を開閉"
            aria-label="敵スペル履歴を開閉"
            data-keep-hand-open="true"
          >
            <span />
            <span />
            <span />
          </button>
          {isEnemySpellHistoryOpen && (
            <div className={styles.enemy_spell_history} aria-live="polite" data-keep-hand-open="true">
              <h4 className={styles.enemy_spell_history_title}>操作</h4>
              <div className={styles.enemy_spell_history_actions}>
                <button
                  type="button"
                  className={styles.enemy_spell_history_action_button}
                  onClick={() => resetGame("cpu")}
                >
                  リスタート
                </button>
                <button
                  type="button"
                  className={`${styles.enemy_spell_history_action_button} ${styles.enemy_spell_history_action_button_danger}`}
                  onClick={() => goToMenu?.()}
                >
                  リタイア
                </button>
              </div>
              <h4 className={styles.enemy_spell_history_title}>敵スペル履歴</h4>
              {enemySpellHistory.length === 0 ? (
                <div className={styles.enemy_spell_history_item}>
                  <span className={styles.enemy_spell_history_text}>まだ履歴はありません</span>
                </div>
              ) : (
                enemySpellHistory.map((entry) => (
                  <div key={entry.id} className={styles.enemy_spell_history_item}>
                    <span className={styles.enemy_spell_history_turn}>R{entry.round}</span>
                    <span className={styles.enemy_spell_history_text}>
                      {entry.spellName} / 対象: {entry.targetLabel} / 結果: {entry.resultText}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* 敵カード演出（中央表示→ターゲットへ飛ぶ） */}
      {cardReveal && typeof document !== "undefined" && createPortal(
        <EnemyCardReveal
          key={`${cardReveal.card.uniqueId}-${cardReveal.type}-${cardReveal.targetId ?? ""}`}
          reveal={cardReveal}
          onComplete={clearCardReveal}
          playerHeroRef={playerHeroRef}
          enemyHeroRef={enemyHeroRef}
          playerFieldRefs={playerFieldRefs}
          enemyFieldRefs={enemyFieldRefs}
        />,
        document.body,
      )}

      {/* ラウンドカウンター & 手札警告 */}
      
      {/* ラウンドカウンター・シナジーインジケーター・手札警告 */}
      {!preGame && !gameOver.over && (() => {
        const currentRound = round ?? Math.ceil(turn / 2);
        const computedPlayerRole = playerRole ?? (coinResult === "player" ? "king" : coinResult === "enemy" ? "usurper" : null);
        const isKing = computedPlayerRole === "king";
        const isUsurper = computedPlayerRole === "usurper";
        const handLow = playerHandCards.length <= 2;
        const fieldBonusActive = isKing && playerFieldCards.length >= 3;
        const daggerCount = playerDaggerCount ?? 0;
        return (
          <div style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
            zIndex: 1100, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            pointerEvents: "none",
          }}>
            {/* ラウンド表示 */}
            <div style={{
              background: "rgba(0,0,0,0.7)", color: "#eee",
              padding: "4px 16px", borderRadius: 20, fontSize: 18, fontWeight: "bold",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span>ラウンド {currentRound} / 10</span>
              {isKing && (
                <span style={{ color: "#a0c8ff", fontSize: 14 }}>
                  残り {Math.max(0, 11 - currentRound)} R
                </span>
              )}
            </div>

            {/* シナジーインジケーター */}
            <div style={{ display: "flex", gap: 6 ,flexDirection: "column", alignItems: "center"}}>
              {/* 王：陣形ボーナス発動中 */}
              {fieldBonusActive && (
                <div style={{
                  background: "rgba(30,90,180,0.85)", color: "#fff",
                  padding: "2px 12px", borderRadius: 12, fontSize: 14, fontWeight: "bold",
                  border: "1px solid #60a8ff",
                  width: "fit-content",
                }}>
                  ⚔ 陣形ボーナス
                </div>
              )}
              {isKing && (
                <div style={{
                  background: "rgba(20,70,120,0.88)", color: "#d8ecff",
                  padding: "2px 12px", borderRadius: 12, fontSize: 14, fontWeight: "bold",
                  border: "1px solid #7fc4ff",
                }}>
                  👑 陣形カウント {kingBoardControlStreak}/{KING_SPECIAL_WIN_STREAK_TURNS}
                </div>
              )}
              {isUsurper && (
                <div style={{
                  background: "rgba(120,20,20,0.9)", color: "#ffd6d6",
                  padding: "2px 12px", borderRadius: 12, fontSize: 14, fontWeight: "bold",
                  border: "1px solid #ff7a7a",
                }}>
                  ⚠ 王の陣形勝利まで残り {Math.max(0, KING_SPECIAL_WIN_STREAK_TURNS - kingBoardControlStreak)} 回
                </div>
              )}
              {/* 簒奪者：このターンの暗器使用回数 */}
              {isUsurper && daggerCount > 0 && (
                <div style={{
                  background: "rgba(60,20,90,0.88)", color: "#e0b0ff",
                  padding: "2px 12px", borderRadius: 12, fontSize: 14, fontWeight: "bold",
                  border: "1px solid #c060ff",
                }}>
                  🗡 このターン ×{daggerCount}
                </div>
              )}
            </div>

            {/* 手札警告 */}
            {handLow && (
              <div style={{
                background: "rgba(180,0,0,0.85)", color: "#fff",
                padding: "3px 14px", borderRadius: 12, fontSize: 12, fontWeight: "bold",
              }}>
                ⚠ 手札残り {playerHandCards.length} 枚
              </div>
            )}
          </div>
        );
      })()}

      {gameOver.over && (
        <GameOver
          winner={gameOver.winner}
          reason={gameOver.reason as any}
          playerRole={playerRole ?? (coinResult === "player" ? "king" : coinResult === "enemy" ? "usurper" : null)}
          turn={turn}
          onRestart={() => resetGame("cpu")}
          onMenu={() => goToMenu?.()}
        />
      )}
    </div>
  );
};
