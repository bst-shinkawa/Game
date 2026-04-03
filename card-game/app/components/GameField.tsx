"use client";

import React, { useEffect, useRef, useContext, useMemo, useCallback } from "react";
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
import Image from "next/image";
import { handleSpellUsage } from "@/app/services/spellUsageService";
import type { Card } from "@/app/data/cards";
import type { DamageFloat } from "@/app/hooks/useGameUI";
import type { RuntimeCard, SelectionMode, SelectionConfig } from "@/app/types/gameTypes";
import styles from "@/app/assets/css/Game.Master.module.css";
import { TimerController } from "./TimerCircle";
import ViewportContext from "@/app/context/ViewportContext";

import { useDragHandler } from "@/app/hooks/useDragHandler";
import { useArrowCanvas } from "@/app/hooks/useArrowCanvas";
import { useDamageMonitor } from "@/app/hooks/useDamageMonitor";
import { useAttackClone } from "@/app/hooks/useAttackClone";

interface GameFieldProps {
  playerHandCards: Card[];
  playerFieldCards: RuntimeCard[];
  playerHeroHp: number;
  enemyHandCards: Card[];
  enemyFieldCards: RuntimeCard[];
  enemyHeroHp: number;
  playerGraveyard: Card[];
  enemyGraveyard: Card[];
  deck: Card[];
  enemyDeck: Card[];
  currentMana: number;
  enemyCurrentMana: number;
  turn: number;
  turnSecondsRemaining: number;
  gameOver: { over: boolean; winner: null | "player" | "enemy"; reason?: string };
  playerRole?: "king" | "usurper" | null;
  round?: number;
  playerDaggerCount?: number;
  enemyDaggerCount?: number;
  preGame: boolean;
  coinResult: "deciding" | "player" | "enemy";
  aiRunning: boolean;
  destroyingCards: Set<string>;
  toasts: ToastItem[];
  actionLogEntries: ActionLogEntry[];
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
  const {
    playerHandCards, playerFieldCards, playerHeroHp,
    enemyHandCards, enemyFieldCards, enemyHeroHp,
    playerGraveyard, enemyGraveyard, deck, enemyDeck,
    currentMana, enemyCurrentMana, turn, turnSecondsRemaining,
    gameOver, playerRole, round, playerDaggerCount, preGame, coinResult, aiRunning, destroyingCards,
    toasts, actionLogEntries, cardReveal, clearCardReveal,
    damageFloats, draggingCard, dragPosition,
    isHandExpanded, activeHandCardId, showTurnModal,
    descCardId, rouletteRunning, rouletteLabel,
    showCoinPopup, mulliganTimer, swapIds, showGameStart,
    attackClone, movingAttack, playerAttackAnimation,
    enemyAttackAnimation, enemySpellAnimation,
    selectionMode, selectionConfig,
    playCardToField, endTurn, attack, castSpell,
    resetGame, finalizeCoin, doMulligan, startMatch,
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
  const timerRef = useRef<TimerController | null>(null);
  const enemyTimerRef = useRef<TimerController | null>(null);

  const viewport = useContext(ViewportContext);
  const isPlayerTurn = turn % 2 === 1;
  const isTimeCritical = isPlayerTurn && turnSecondsRemaining <= 20;
  const isTimerActive = !preGame && !showTurnModal && !showGameStart && !gameOver.over;

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
    if (!draggingCard) return;

    if (preGame && coinResult !== "deciding") {
      setSwapIds(swapIds.includes(draggingCard) ? swapIds.filter((id) => id !== draggingCard) : [...swapIds, draggingCard]);
      setDraggingCard(null);
      return;
    }

    onPlayerFieldDropCallback(draggingCard);
    setDraggingCard(null);
  }, [draggingCard, preGame, coinResult, swapIds, setDraggingCard, setSwapIds, onPlayerFieldDropCallback]);

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
    playerHeroHp, enemyHeroHp, playerFieldCards, enemyFieldCards,
    damageFloats, setDamageFloats,
    playerHeroRef, enemyHeroRef, playerFieldRefs, enemyFieldRefs,
  });

  useAttackClone({
    movingAttack, enemyFieldCards,
    enemyFieldRefs, playerFieldRefs, playerHeroRef,
    attackClone, setAttackClone, damageFloats, setDamageFloats,
  });

  // --- Turn modal ---
  useEffect(() => {
    if (preGame || showGameStart) { setShowTurnModal(false); return; }
    setShowTurnModal(true);
    const duration = isPlayerTurn ? 2000 : 1200;
    const t = setTimeout(() => setShowTurnModal(false), duration);
    return () => { clearTimeout(t); setShowTurnModal(false); };
  }, [isPlayerTurn, turn, preGame, showGameStart, setShowTurnModal]);

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
          onRouletteAnimEnd={() => {
            setTimeout(() => {
              const winner = Math.random() < 0.5 ? "player" : "enemy";
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

      {/* Menu buttons */}
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 1200, display: "flex", gap: 8 }}>
        <button onClick={() => resetGame("cpu")}>リスタート</button>
        <button onClick={() => resetGame("cpu")}>リタイア</button>
      </div>

      {/* AI attack clone portal */}
      {typeof document !== "undefined" &&
        attackClone &&
        createPortal(
          (() => {
            const { start, end, card, started, duration } = attackClone;
            const deltaX = end.left - start.left;
            const deltaY = end.top - start.top;
            const baseStyle: React.CSSProperties = {
              position: "fixed", left: start.left, top: start.top,
              width: start.width, height: start.height,
              transform: started ? `translate(${deltaX}px, ${deltaY}px)` : "translate(0px, 0px)",
              transition: `transform ${duration}ms ease, opacity ${Math.max(200, duration / 3)}ms ease`,
              zIndex: 980, pointerEvents: "none", opacity: started ? 0.95 : 1,
            };
            return (
              <div style={baseStyle} className={styles.card}>
                {card.image && <Image src={card.image} alt={card.name} width={100} height={100} priority unoptimized />}
                <div className={styles.card_hp}><p>{Math.min(card.hp ?? 0, card.maxHp ?? 0)}</p></div>
                <div className={styles.card_attack}><p>{card.attack ?? 0}</p></div>
              </div>
            );
          })(),
          document.body
        )}

      {/* Turn modal */}
      {showTurnModal && (
        <div style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,0.85)", color: "#fff", padding: 20, borderRadius: 12 }}>
            <h1 style={{ fontSize: 45, margin: 0 }}>{isPlayerTurn ? "Your Turn" : "Enemy Turn"}</h1>
          </div>
        </div>
      )}

      {/* GameStart overlay */}
      {showGameStart && (
        <div style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,0.85)", color: "#fff", padding: 40, borderRadius: 12 }}>
            <h1 style={{ fontSize: 72, margin: 0 }}>GameStart</h1>
          </div>
        </div>
      )}

      {/* Enemy area */}
      <EnemyArea
        enemyHeroHp={enemyHeroHp}
        enemyHandCards={preGame ? [] : enemyHandCards}
        enemyFieldCards={enemyFieldCards}
        enemyDeck={enemyDeck}
        enemyGraveyard={enemyGraveyard}
        enemyCurrentMana={enemyCurrentMana}
        turnSecondsRemaining={turnSecondsRemaining}
        isPlayerTurn={isPlayerTurn}
        draggingCard={draggingCard}
        playerHandCards={playerHandCards}
        playerAttackAnimation={playerAttackAnimation}
        enemyAttackAnimation={enemyAttackAnimation}
        enemySpellAnimation={enemySpellAnimation}
        hoverTarget={hoverTarget}
        dropSuccess={dropSuccess}
        attackTargets={attackTargets}
        destroyingCards={destroyingCards}
        onDragOver={(e) => {
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const isHeal = handCard && handCard.effect === "heal_single";
          if (draggingCard && (!isHeal || !handCard)) e.preventDefault();
        }}
        onDrop={(targetId) => {
          if (!draggingCard) return;
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          if (handCard && handCard.type === "spell") {
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
        }}
        onCardClick={(cardId: string) => setDescCardId(descCardId === cardId ? null : cardId)}
        enemyHeroRef={enemyHeroRef}
        enemyFieldRefs={enemyFieldRefs}
        enemyTimerRef={enemyTimerRef}
        isTimerActive={isTimerActive}
        enemyTurnTimer={enemyTurnTimer}
        selectionMode={selectionMode}
        selectionConfig={selectionConfig}
        applySelection={applySelection}
      />

      {/* Player area */}
      <PlayerArea
        playerHeroHp={playerHeroHp}
        playerHandCards={preGame ? [] : playerHandCards}
        playerFieldCards={playerFieldCards}
        playerDeck={deck}
        playerGraveyard={playerGraveyard}
        currentMana={currentMana}
        playerDaggerCount={playerDaggerCount ?? 0}
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
        timerRef={timerRef}
        isTimerActive={isTimerActive}
        playerTurnTimer={playerTurnTimer}
        hoverTarget={hoverTarget}
        dropSuccess={dropSuccess}
        selectionMode={selectionMode}
        selectionConfig={selectionConfig}
        applySelection={applySelection}
      />

      {/* Turn End button */}
      <div className={styles.field_turn_wrapper}>
        <div className={styles.field_turn}>
          <button
            onClick={() => endTurn()}
            disabled={!isPlayerTurn || aiRunning || preGame || showGameStart}
            className={isTimeCritical ? styles.field_turn_end_critical : ""}
            title={
              preGame ? "ゲーム開始前です" :
              showTurnModal ? "ターン切替処理中です" :
              !isPlayerTurn ? "相手のターンです" : "ターンを終了します"
            }
          >
            <span className={styles.field_turn_text}>TURN END</span>
          </button>
        </div>
      </div>

      <Toast toasts={toasts} />
      <ActionLog entries={actionLogEntries} />

      {/* 敵カード演出（中央表示→ターゲットへ飛ぶ） */}
      {cardReveal && typeof document !== "undefined" && createPortal(
        <EnemyCardReveal
          reveal={cardReveal}
          onComplete={clearCardReveal}
          playerHeroRef={playerHeroRef}
          enemyHeroRef={enemyHeroRef}
          playerFieldRefs={playerFieldRefs}
          enemyFieldRefs={enemyFieldRefs}
        />,
        document.body,
      )}

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
              padding: "4px 16px", borderRadius: 20, fontSize: 13, fontWeight: "bold",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span>ラウンド {currentRound} / 10</span>
              {isKing && (
                <span style={{ color: "#a0c8ff", fontSize: 11 }}>
                  残り {Math.max(0, 11 - currentRound)} R
                </span>
              )}
            </div>

            {/* シナジーインジケーター */}
            <div style={{ display: "flex", gap: 6 }}>
              {/* 王：陣形ボーナス発動中 */}
              {fieldBonusActive && (
                <div style={{
                  background: "rgba(30,90,180,0.85)", color: "#fff",
                  padding: "2px 12px", borderRadius: 12, fontSize: 12, fontWeight: "bold",
                  border: "1px solid #60a8ff",
                }}>
                  ⚔ 陣形ボーナス
                </div>
              )}
              {/* 簒奪者：暗器カウンター */}
              {isUsurper && daggerCount > 0 && (
                <div style={{
                  background: "rgba(60,20,90,0.88)", color: "#e0b0ff",
                  padding: "2px 12px", borderRadius: 12, fontSize: 12, fontWeight: "bold",
                  border: "1px solid #c060ff",
                }}>
                  🗡 暗器 ×{daggerCount}
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
          onMenu={() => {}}
        />
      )}
    </div>
  );
};
