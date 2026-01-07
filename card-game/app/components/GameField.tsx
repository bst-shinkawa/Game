"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { TurnTimer } from "@/app/data/turnTimer";
import { DamageFloater } from "./DamageFloater";
import { EnemyArea } from "./EnemyArea";
import { PlayerArea } from "./PlayerArea";
import CardItem from "./CardItem";
import { PreGame } from "./PreGame";
import GameOver from "./GameOver";
import type { Card } from "@/app/data/cards";
import type { DamageFloat } from "@/app/hooks/useGameUI";
import styles from "@/app/assets/css/Game.Master.module.css";
import { TimerController } from "./TimerCircle";

interface GameFieldProps {
  // ゲームロジック
  playerHandCards: Card[];
  playerFieldCards: (Card & { maxHp: number; canAttack?: boolean })[];
  playerHeroHp: number;
  enemyHandCards: Card[];
  enemyFieldCards: (Card & { maxHp: number; canAttack?: boolean })[];
  enemyHeroHp: number;
  playerGraveyard: Card[];
  enemyGraveyard: Card[];
  deck: Card[];
  enemyDeck: Card[];
  currentMana: number;
  enemyCurrentMana: number;
  turn: number;
  turnSecondsRemaining: number;
  gameOver: { over: boolean; winner: null | "player" | "enemy" };
  preGame: boolean;
  coinResult: "deciding" | "player" | "enemy";
  aiRunning: boolean;

  // UI状態
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
  enemyAttackAnimation: { sourceCardId: string | null; targetId: string | "hero" } | null;
  enemySpellAnimation: { targetId: string | "hero"; effect: string } | null;

  // ゲーム操作
  playCardToField: (card: Card) => void;
  endTurn: () => void;
  attack: (attackerId: string, targetId: string | "hero", isPlayerAttacker?: boolean) => void;
  castSpell: (cardUniqueId: string, targetId: string | "hero", isPlayer?: boolean) => void;
  resetGame: (mode: "cpu" | "pvp") => void;
  finalizeCoin: (winner: "player" | "enemy") => void;
  doMulligan: (keepIds: string[]) => void;
  startMatch: () => void;

  // UI更新関数
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

  // Refs
  playerBattleRef: React.MutableRefObject<HTMLDivElement | null>;
  handAreaRef: React.MutableRefObject<HTMLDivElement | null>;
  collapseHand: () => void;
}

export const GameField: React.FC<GameFieldProps> = ({
  // ゲームロジック
  playerHandCards,
  playerFieldCards,
  playerHeroHp,
  enemyHandCards,
  enemyFieldCards,
  enemyHeroHp,
  playerGraveyard,
  enemyGraveyard,
  deck,
  enemyDeck,
  currentMana,
  enemyCurrentMana,
  turn,
  turnSecondsRemaining,
  gameOver,
  preGame,
  coinResult,
  aiRunning,
  // UI状態
  damageFloats,
  draggingCard,
  dragPosition,
  isHandExpanded,
  activeHandCardId,
  showTurnModal,
  descCardId,
  rouletteRunning,
  rouletteLabel,
  showCoinPopup,
  mulliganTimer,
  swapIds,
  showGameStart,
  attackClone,
  movingAttack,
  enemyAttackAnimation,
  enemySpellAnimation,
  // ゲーム操作
  playCardToField,
  endTurn,
  attack,
  castSpell,
  resetGame,
  finalizeCoin,
  doMulligan,
  startMatch,
  // UI更新関数
  setDamageFloats,
  setDraggingCard,
  setDragPosition,
  setArrowStartPos,
  setIsHandExpanded,
  setActiveHandCardId,
  setShowTurnModal,
  setPauseTimer,
  setDescCardId,
  setRouletteRunning,
  setRouletteLabel,
  setShowCoinPopup,
  setMulliganTimer,
  setSwapIds,
  setShowGameStart,
  setAttackClone,
  // Refs
  playerBattleRef,
  handAreaRef,
  collapseHand,
  playerTurnTimer,
  enemyTurnTimer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enemyHeroRef = useRef<HTMLDivElement | null>(null);
  const enemyFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const playerHeroRef = useRef<HTMLDivElement | null>(null);
  const playerFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const arrowStartPos = useRef<{ x: number; y: number } | null>(null);

  const timerRef = useRef<TimerController | null>(null); 
  const enemyTimerRef = useRef<TimerController | null>(null);

  const isPlayerTurn = turn % 2 === 1;
  const MAX_TIME = 60;

  const isTimeCritical = isPlayerTurn && turnSecondsRemaining <= 20;

  // ドラッグ中のマウス座標追跡（mousemove / dragover を rAF でバッファして更新）
  const dragPendingRef = React.useRef<{ x: number; y: number } | null>(null);
  const dragRafRef = React.useRef<number | null>(null);
  const dragOffsetRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverTarget, setHoverTarget] = React.useState<{ type: string | null; id?: string | null }>({ type: null });
  const [dropSuccess, setDropSuccess] = React.useState<{ type: string | null; id?: string | null }>({ type: null });

  useEffect(() => {
    if (!draggingCard) {
      setHoverTarget({ type: null });
      return;
    }

    const flushPending = () => {
      if (dragPendingRef.current) {
        const pos = { x: dragPendingRef.current.x - dragOffsetRef.current.x, y: dragPendingRef.current.y - dragOffsetRef.current.y };
        setDragPosition(pos);
        // determine hover target
        try {
          const el = document.elementFromPoint(dragPendingRef.current.x, dragPendingRef.current.y) as HTMLElement | null;
          if (el) {
            const enemyHeroEl = el.closest('.' + styles.field_enemy_hero);
            const playerHeroEl = el.closest('.' + styles.field_player_hero);
            const enemyBattleEl = el.closest('.' + styles.field_enemy_battle);
            const playerBattleEl = el.closest('.' + styles.field_player_battle);
            const cardEl = el.closest('[data-uniqueid]') as HTMLElement | null;

            if (enemyHeroEl) setHoverTarget({ type: 'enemyHero' });
            else if (playerHeroEl) setHoverTarget({ type: 'playerHero' });
            else if (cardEl && enemyBattleEl) setHoverTarget({ type: 'enemyCard', id: cardEl.getAttribute('data-uniqueid') });
            else if (cardEl && playerBattleEl) setHoverTarget({ type: 'playerCard', id: cardEl.getAttribute('data-uniqueid') });
            else if (playerBattleEl) setHoverTarget({ type: 'playerBattle' });
            else if (enemyBattleEl) setHoverTarget({ type: 'enemyBattle' });
            else setHoverTarget({ type: null });
          } else {
            setHoverTarget({ type: null });
          }
        } catch (e) {
          setHoverTarget({ type: null });
        }

        dragPendingRef.current = null;
      }
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };

    const scheduleFlush = () => {
      if (dragRafRef.current != null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        if (dragPendingRef.current) {
          const pos = { x: dragPendingRef.current.x - dragOffsetRef.current.x, y: dragPendingRef.current.y - dragOffsetRef.current.y };
          setDragPosition(pos);
          // determine hover target
          try {
            const p = dragPendingRef.current as { x: number; y: number };
            const el = document.elementFromPoint(p.x, p.y) as HTMLElement | null;
            if (el) {
              const enemyHeroEl = el.closest('.' + styles.field_enemy_hero);
              const playerHeroEl = el.closest('.' + styles.field_player_hero);
              const enemyBattleEl = el.closest('.' + styles.field_enemy_battle);
              const playerBattleEl = el.closest('.' + styles.field_player_battle);
              const cardEl = el.closest('[data-uniqueid]') as HTMLElement | null;

              if (enemyHeroEl) setHoverTarget({ type: 'enemyHero' });
              else if (playerHeroEl) setHoverTarget({ type: 'playerHero' });
              else if (cardEl && enemyBattleEl) setHoverTarget({ type: 'enemyCard', id: cardEl.getAttribute('data-uniqueid') });
              else if (cardEl && playerBattleEl) setHoverTarget({ type: 'playerCard', id: cardEl.getAttribute('data-uniqueid') });
              else if (playerBattleEl) setHoverTarget({ type: 'playerBattle' });
              else if (enemyBattleEl) setHoverTarget({ type: 'enemyBattle' });
              else setHoverTarget({ type: null });
            } else {
              setHoverTarget({ type: null });
            }
          } catch (e) {
            setHoverTarget({ type: null });
          }
          dragPendingRef.current = null;
        }
        dragRafRef.current = null;
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      dragPendingRef.current = { x: e.clientX, y: e.clientY };
      scheduleFlush();
    };

    const handleDragOver = (e: DragEvent) => {
      // dragover provides client coordinates reliably during HTML5 drag
      dragPendingRef.current = { x: e.clientX, y: e.clientY };
      scheduleFlush();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('dragover', handleDragOver);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('dragover', handleDragOver);
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      dragPendingRef.current = null;
      dragRafRef.current = null;
      setHoverTarget({ type: null });
    };
  }, [draggingCard, setDragPosition]);

  // Pointer / touch fallback: document-level pointer handling to support mobile drag
  useEffect(() => {
    let activePointerId: number | null = null;
    let startRect: DOMRect | null = null;
    let pointerOffset = { x: 0, y: 0 };
    // element that we captured pointer on (for pointer events)
    let capturedPointerElement: HTMLElement | null = null;
    let capturedPointerId: number | null = null;
    const DEBUG = typeof window !== 'undefined' && (window as any).__GAME_DRAG_DEBUG__ === true;
    const [debugEvents, setDebugEvents] = React.useState<Array<{ t: number; text: string; data?: any }>>([]);
    const pushDebug = (text: string, data?: any) => {
      const enabled = typeof window !== 'undefined' && (window as any).__GAME_DRAG_DEBUG__ === true;
      if (!enabled) return;
      setDebugEvents((prev) => [{ t: Date.now(), text, data }, ...prev].slice(0, 12));
    };

    const DRAG_START_THRESHOLD = 6;

    const beginPotentialDrag = (startX: number, startY: number, el: HTMLElement, id: string, idForPointer?: number | null) => {
      activePointerId = idForPointer ?? null;
      startRect = el.getBoundingClientRect();
      let dragStarted = false;
      if (DEBUG) { console.debug('[drag-debug] beginPotentialDrag', { id, startX, startY, idForPointer, startRect: { left: startRect.left, top: startRect.top, width: startRect.width, height: startRect.height } }); pushDebug('beginPotentialDrag', { id, startX, startY, idForPointer, startRect: { left: startRect.left, top: startRect.top, width: startRect.width, height: startRect.height } }); }

      const forceStart = () => {
        if (dragStarted) return;
        if (DEBUG) { console.debug('[drag-debug] forceStart', { id }); pushDebug('forceStart', { id }); }
        dragStarted = true;
        try { (document.activeElement as HTMLElement | null)?.blur(); } catch (e) {}
        pointerOffset = { x: startX - (startRect!.left), y: startY - (startRect!.top) };
        setDraggingCard(id);
        arrowStartPos.current = { x: startRect!.left + startRect!.width / 2, y: startRect!.top + startRect!.height / 2 };
        setDragPosition({ x: startX - pointerOffset.x, y: startY - pointerOffset.y });
      };

      const onMove = (x: number, y: number, preventDefaultIfStarted = true) => {
        const dx = x - startX;
        const dy = y - startY;
        if (!dragStarted) {
          if (Math.hypot(dx, dy) > DRAG_START_THRESHOLD) {
            dragStarted = true;
            if (DEBUG) { console.debug('[drag-debug] dragStarted by move', { id, x, y, dx, dy }); pushDebug('dragStarted by move', { id, x, y, dx, dy }); }
            // prevent native scrolling when drag actually starts
            if (preventDefaultIfStarted) {
              try { /* best-effort */ (document.activeElement as HTMLElement | null)?.blur(); } catch (e) {}
            }
            // compute offset relative to top-left so the grabbed point stays under pointer
            pointerOffset = { x: startX - (startRect!.left), y: startY - (startRect!.top) };
            setDraggingCard(id);
            arrowStartPos.current = { x: startRect!.left + startRect!.width / 2, y: startRect!.top + startRect!.height / 2 };
            setDragPosition({ x: x - pointerOffset.x, y: y - pointerOffset.y });
            return true;
          }
          return false;
        } else {
          if (DEBUG) { console.debug('[drag-debug] dragMove', { id, x, y }); pushDebug('dragMove', { id, x, y }); }
          setDragPosition({ x: x - pointerOffset.x, y: y - pointerOffset.y });
          return true;
        }
      };

      return { onMove, forceStart, finish: () => { if (DEBUG) console.debug('[drag-debug] finish', { id }); startRect = null; activePointerId = null; try { if (capturedPointerElement && capturedPointerId != null) { capturedPointerElement.releasePointerCapture(capturedPointerId); if (DEBUG) { console.debug('[drag-debug] finish releasePointerCapture', { id, pid: capturedPointerId }); pushDebug('finish releasePointerCapture', { id, pid: capturedPointerId }); } } } catch (err) { if (DEBUG) { console.debug('[drag-debug] finish releasePointerCapture failed', err); pushDebug('finish releasePointerCapture failed', { id, err: String(err) }); } } capturedPointerElement = null; capturedPointerId = null; } };
    };

    const onPointerDown = (e: PointerEvent) => {
      // find the closest card element that has data-uniqueid
      const el = (e.target as HTMLElement).closest('[data-uniqueid]') as HTMLElement | null;
      if (!el) return;
      const id = el.getAttribute('data-uniqueid');
      if (!id) return;

      // only start - if it's a player hand card or an attack-capable field card
      const handCard = playerHandCards.find((c) => c.uniqueId === id);
      const fieldCard = playerFieldCards.find((c) => c.uniqueId === id && c.canAttack);
      if (!handCard && !fieldCard) return;
      // ignore if not player's turn
      if (!isPlayerTurn) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const pd = beginPotentialDrag(startX, startY, el, id, (e as any).pointerId ?? null);
      if (DEBUG) console.debug('[drag-debug] pointerdown', { id, startX, startY, pointerId: (e as any).pointerId, handCard: !!handCard, fieldCard: !!fieldCard });
      // Try to capture the pointer on the original element so we keep receiving pointermove/up even if DOM changes
      try {
        const pid = (e as any).pointerId ?? null;
        if (pid != null && el && (el as any).setPointerCapture) {
          try {
            (el as any).setPointerCapture(pid);
            capturedPointerElement = el;
            capturedPointerId = pid;
            if (DEBUG) { console.debug('[drag-debug] setPointerCapture', { id, pid }); pushDebug('setPointerCapture', { id, pid }); }
          } catch (err) { if (DEBUG) { console.debug('[drag-debug] setPointerCapture failed', err); pushDebug('setPointerCapture failed', { id, err: String(err) }); } }
        }
      } catch (err) { if (DEBUG) console.debug('[drag-debug] setPointerCapture failed', err); }

      // long-press fallback for pointer (some mobile browsers use pointer events)
      let longPressTimer: number | null = null;
      const LONG_PRESS_MS = 180;
      longPressTimer = window.setTimeout(() => {
        if (DEBUG) { console.debug('[drag-debug] pointer longPress fired', { id }); pushDebug('pointer longPress fired', { id }); }
        pd.forceStart();
      }, LONG_PRESS_MS);
      if (DEBUG) { console.debug('[drag-debug] set pointer longPress timer', { ms: LONG_PRESS_MS, id }); pushDebug('set pointer longPress timer', { ms: LONG_PRESS_MS, id }); }

      const moveHandler = (ev: PointerEvent) => {
        if (activePointerId == null || (ev as any).pointerId !== activePointerId) return;
        // cancel longPress if user moved
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4 && longPressTimer != null) { if (DEBUG) { console.debug('[drag-debug] pointer move cancelled longPress', { id }); pushDebug('pointer move cancelled longPress', { id }); } clearTimeout(longPressTimer); longPressTimer = null; }
        if (pd.onMove(ev.clientX, ev.clientY)) {
          if (longPressTimer != null) { if (DEBUG) { console.debug('[drag-debug] pointer move started drag', { id }); pushDebug('pointer move started drag', { id }); } clearTimeout(longPressTimer); longPressTimer = null; }
          if (DEBUG) { console.debug('[drag-debug] pointer move prevented default', { id, x: ev.clientX, y: ev.clientY }); pushDebug('pointer move prevented default', { id, x: ev.clientX, y: ev.clientY }); }
          ev.preventDefault();
        }
      };

      const upHandler = (ev: PointerEvent) => {
        if (longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
        if (activePointerId == null || (ev as any).pointerId !== activePointerId) return;
        // if drag didn't start, leave click semantics intact
        if (pd.onMove(ev.clientX, ev.clientY, false) === false) {
          if (DEBUG) console.debug('[drag-debug] pointer up without drag (click)', { id, x: ev.clientX, y: ev.clientY });
          document.removeEventListener('pointermove', moveHandler);
          document.removeEventListener('pointerup', upHandler);
          pd.finish();
          return;
        }
        if (DEBUG) { console.debug('[drag-debug] pointer up with drop', { id, x: ev.clientX, y: ev.clientY }); pushDebug('pointer up with drop', { id, x: ev.clientX, y: ev.clientY }); }

        // finish drop logic (same as before)
        ev.preventDefault();
        const dropEl = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        const isDropOnEnemyHero = dropEl && enemyHeroRef.current && (enemyHeroRef.current === dropEl || enemyHeroRef.current.contains(dropEl));
        const dropFieldCardEl = dropEl ? dropEl.closest('[data-uniqueid]') as HTMLElement | null : null;
        const dropFieldCardId = dropFieldCardEl?.getAttribute('data-uniqueid') || null;

        if (handCard) {
          if (isDropOnEnemyHero) {
            if (handCard.type === 'spell') castSpell(handCard.uniqueId, 'hero', true);
            else attack(handCard.uniqueId, 'hero', true);
          } else if (dropFieldCardId && enemyFieldCards.some(c => c.uniqueId === dropFieldCardId)) {
            if (handCard.type === 'spell') castSpell(handCard.uniqueId, dropFieldCardId, true);
            else attack(handCard.uniqueId, dropFieldCardId, true);
          } else if (dropEl && playerBattleRef.current && (playerBattleRef.current === dropEl || playerBattleRef.current.contains(dropEl))) {
            if (preGame && coinResult !== 'deciding') {
              setSwapIds(swapIds.includes(handCard.uniqueId) ? swapIds.filter(id => id !== handCard.uniqueId) : [...swapIds, handCard.uniqueId]);
            } else if (handCard.type !== 'spell') {
              playCardToField(handCard);
            }
          }
        } else if (fieldCard) {
          if (isDropOnEnemyHero) {
            attack(fieldCard.uniqueId, 'hero', true);
          } else if (dropFieldCardId && enemyFieldCards.some(c => c.uniqueId === dropFieldCardId)) {
            attack(fieldCard.uniqueId, dropFieldCardId, true);
          }
        }

        setDraggingCard(null);
        arrowStartPos.current = null;
        // release any pointer capture
        try {
          if (capturedPointerElement && capturedPointerId != null) {
            capturedPointerElement.releasePointerCapture(capturedPointerId);
            if (DEBUG) { console.debug('[drag-debug] releasePointerCapture', { id, pid: capturedPointerId }); pushDebug('releasePointerCapture', { id, pid: capturedPointerId }); }
          }
        } catch (err) { if (DEBUG) { console.debug('[drag-debug] releasePointerCapture failed', err); pushDebug('releasePointerCapture failed', { id, err: String(err) }); } }
        capturedPointerElement = null;
        capturedPointerId = null;
        document.removeEventListener('pointermove', moveHandler);
        document.removeEventListener('pointerup', upHandler);
        pd.finish();
      };

      document.addEventListener('pointermove', moveHandler);
      document.addEventListener('pointerup', upHandler);
    };

    // Touch fallback for browsers that don't emit pointer events reliably
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const el = (e.target as HTMLElement).closest('[data-uniqueid]') as HTMLElement | null;
      if (!el) return;
      const id = el.getAttribute('data-uniqueid');
      if (!id) return;

      const handCard = playerHandCards.find((c) => c.uniqueId === id);
      const fieldCard = playerFieldCards.find((c) => c.uniqueId === id && c.canAttack);
      if (!handCard && !fieldCard) return;
      if (!isPlayerTurn) return;

      const startX = t.clientX;
      const startY = t.clientY;
      const pd = beginPotentialDrag(startX, startY, el, id, null);
      if (DEBUG) console.debug('[drag-debug] touchstart', { id, startX, startY, handCard: !!handCard, fieldCard: !!fieldCard });

      // long-press fallback for touch to start drag without movement
      let longPressTimer: number | null = null;
      const LONG_PRESS_MS = 180;
      longPressTimer = window.setTimeout(() => {
        if (DEBUG) { console.debug('[drag-debug] touch longPress fired', { id }); pushDebug('touch longPress fired', { id }); }
        pd.forceStart();
      }, LONG_PRESS_MS);
      if (DEBUG) { console.debug('[drag-debug] set touch longPress timer', { ms: LONG_PRESS_MS, id }); pushDebug('set touch longPress timer', { ms: LONG_PRESS_MS, id }); }

      const touchMove = (ev: TouchEvent) => {
        const t2 = ev.touches[0];
        if (!t2) return;
        // if user moved before long-press, cancel timer
        if (Math.hypot(t2.clientX - startX, t2.clientY - startY) > 4 && longPressTimer != null) {
          if (DEBUG) console.debug('[drag-debug] touch move cancelled longPress', { id });
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // prevent scrolling only once drag begins
        if (pd.onMove(t2.clientX, t2.clientY)) {
          if (longPressTimer != null) { if (DEBUG) { console.debug('[drag-debug] touch move started drag', { id }); pushDebug('touch move started drag', { id }); } clearTimeout(longPressTimer); longPressTimer = null; }
          if (DEBUG) { console.debug('[drag-debug] touch move prevented default', { id, x: t2.clientX, y: t2.clientY }); pushDebug('touch move prevented default', { id, x: t2.clientX, y: t2.clientY }); }
          ev.preventDefault();
        }
      };

      const touchEnd = (ev: TouchEvent) => {
        if (longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
        const t2 = ev.changedTouches[0];
        if (!t2) return;
        if (pd.onMove(t2.clientX, t2.clientY, false) === false) {
          if (DEBUG) console.debug('[drag-debug] touch end without drag (tap)', { id, x: t2.clientX, y: t2.clientY });
          document.removeEventListener('touchmove', touchMove, { passive: false } as any);
          document.removeEventListener('touchend', touchEnd);
          pd.finish();
          return;
        }
        if (DEBUG) { console.debug('[drag-debug] touch end with drop', { id, x: t2.clientX, y: t2.clientY }); pushDebug('touch end with drop', { id, x: t2.clientX, y: t2.clientY }); }

        // finish drop
        const dropEl = document.elementFromPoint(t2.clientX, t2.clientY) as HTMLElement | null;
        const isDropOnEnemyHero = dropEl && enemyHeroRef.current && (enemyHeroRef.current === dropEl || enemyHeroRef.current.contains(dropEl));
        const dropFieldCardEl = dropEl ? dropEl.closest('[data-uniqueid]') as HTMLElement | null : null;
        const dropFieldCardId = dropFieldCardEl?.getAttribute('data-uniqueid') || null;

        if (handCard) {
          if (isDropOnEnemyHero) {
            if (handCard.type === 'spell') castSpell(handCard.uniqueId, 'hero', true);
            else attack(handCard.uniqueId, 'hero', true);
          } else if (dropFieldCardId && enemyFieldCards.some(c => c.uniqueId === dropFieldCardId)) {
            if (handCard.type === 'spell') castSpell(handCard.uniqueId, dropFieldCardId, true);
            else attack(handCard.uniqueId, dropFieldCardId, true);
          } else if (dropEl && playerBattleRef.current && (playerBattleRef.current === dropEl || playerBattleRef.current.contains(dropEl))) {
            if (preGame && coinResult !== 'deciding') {
              setSwapIds(swapIds.includes(handCard.uniqueId) ? swapIds.filter(id => id !== handCard.uniqueId) : [...swapIds, handCard.uniqueId]);
            } else if (handCard.type !== 'spell') {
              playCardToField(handCard);
            }
          }
        } else if (fieldCard) {
          if (isDropOnEnemyHero) {
            attack(fieldCard.uniqueId, 'hero', true);
          } else if (dropFieldCardId && enemyFieldCards.some(c => c.uniqueId === dropFieldCardId)) {
            attack(fieldCard.uniqueId, dropFieldCardId, true);
          }
        }

        setDraggingCard(null);
        arrowStartPos.current = null;
        document.removeEventListener('touchmove', touchMove as EventListenerOrEventListenerObject);
        document.removeEventListener('touchend', touchEnd as EventListenerOrEventListenerObject);
        pd.finish();
      };

      document.addEventListener('touchmove', touchMove, { passive: false } as any);
      document.addEventListener('touchend', touchEnd as any);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('touchstart', onTouchStart, { passive: true } as any);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('touchstart', onTouchStart as any);
    };
  }, [playerHandCards, playerFieldCards, isPlayerTurn, castSpell, attack, playCardToField, preGame, coinResult, swapIds]);



  // ターン切替時に中央モーダルを短時間表示する（UI のみ）
  useEffect(() => {
    if (preGame || showGameStart) {
      setShowTurnModal(false);
      return;
    }
    setShowTurnModal(true);
    const duration = isPlayerTurn ? 2000 : 1200;
    const t = setTimeout(() => {
      setShowTurnModal(false);
    }, duration);
    return () => {
      clearTimeout(t);
      setShowTurnModal(false);
    };
  }, [isPlayerTurn, turn, preGame, showGameStart, setShowTurnModal]);

  // ダメージフロート表示ロジック: ヒーローとフィールドカードのHP変化を監視してフロートを追加
  const prevPlayerHeroHp = useRef<number>(playerHeroHp);
  const prevEnemyHeroHp = useRef<number>(enemyHeroHp);
  const prevFieldHp = useRef<{ [id: string]: number }>({});

  useEffect(() => {
    // ヒーローダメージ
    if (playerHeroHp < prevPlayerHeroHp.current && playerHeroRef.current) {
      const rect = playerHeroRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const amount = prevPlayerHeroHp.current - playerHeroHp;
      setDamageFloats([...damageFloats, { id: `playerHero-${Date.now()}`, target: 'playerHero', amount, x, y }]);
    }
    if (enemyHeroRef.current && enemyHeroHp < prevEnemyHeroHp.current) {
      const rect = enemyHeroRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const amount = prevEnemyHeroHp.current - enemyHeroHp;
      setDamageFloats([...damageFloats, { id: `enemyHero-${Date.now()}`, target: 'enemyHero', amount, x, y }]);
    }
    prevPlayerHeroHp.current = playerHeroHp;
    prevEnemyHeroHp.current = enemyHeroHp;

    // フィールドカードのHP変化
    playerFieldCards.forEach((c) => {
      const prev = prevFieldHp.current[c.uniqueId];
      if (prev !== undefined && c.hp !== undefined && c.hp < prev) {
        const ref = playerFieldRefs.current[c.uniqueId];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const amount = prev - (c.hp ?? 0);
          setDamageFloats([...damageFloats, { id: `${c.uniqueId}-${Date.now()}`, target: c.uniqueId, amount, x, y }]);
        }
      }
      prevFieldHp.current[c.uniqueId] = c.hp ?? 0;
    });

    enemyFieldCards.forEach((c) => {
      const prev = prevFieldHp.current[c.uniqueId];
      if (prev !== undefined && c.hp !== undefined && c.hp < prev) {
        const ref = enemyFieldRefs.current[c.uniqueId];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const amount = prev - (c.hp ?? 0);
          setDamageFloats([...damageFloats, { id: `${c.uniqueId}-${Date.now()}`, target: c.uniqueId, amount, x, y }]);
        }
      }
      prevFieldHp.current[c.uniqueId] = c.hp ?? 0;
    });
    // 削除されたカードは記録から除外
    Object.keys(prevFieldHp.current).forEach((id) => {
      if (!playerFieldCards.some((c) => c.uniqueId === id) && !enemyFieldCards.some((c) => c.uniqueId === id)) {
        delete prevFieldHp.current[id];
      }
    });
  }, [playerHeroHp, enemyHeroHp, playerFieldCards, enemyFieldCards, setDamageFloats, playerHeroRef, enemyHeroRef, playerFieldRefs, enemyFieldRefs]);

  // Canvas 矢印描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawArrow = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!draggingCard || !arrowStartPos.current) return;

      const isHandCard = playerHandCards.some(c => c.uniqueId === draggingCard);
      const draggingCardObj = playerHandCards.find(c => c.uniqueId === draggingCard) || playerFieldCards.find(c => c.uniqueId === draggingCard);
      const isHandSpell = isHandCard && draggingCardObj?.type === "spell";
      const isHealSpell = isHandSpell && (draggingCardObj?.effect === "heal_single");
      const isHasteSpell = isHandSpell && (draggingCardObj?.effect === "haste");
      const isDamageSpell = isHandSpell && !isHealSpell && !isHasteSpell;
      if (isHandCard && !isHandSpell) return;

      const attackingCard = playerFieldCards.find(c => c.uniqueId === draggingCard && c.canAttack);
      if (attackingCard || isHandSpell) {
        const targets: { x: number; y: number; kind: "damage" | "heal" }[] = [];

        if (isDamageSpell || attackingCard) {
          const canTargetHero = !((attackingCard as { rushInitialTurn?: boolean })?.rushInitialTurn);
          const hasWallGuardOnEnemy = enemyFieldCards.some((c) => (c as { wallGuard?: boolean }).wallGuard);

          if (canTargetHero && !hasWallGuardOnEnemy && enemyHeroRef.current) {
            const rect = enemyHeroRef.current.getBoundingClientRect();
            targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height, kind: "damage" });
          }

          for (const c of enemyFieldCards) {
            const ref = enemyFieldRefs.current[c.uniqueId];
            if (ref) {
              if ((c as { stealth?: boolean }).stealth) continue;
              const rect = ref.getBoundingClientRect();
              targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "damage" });
            }
          }
        }

        if (isHealSpell) {
          if (playerHeroRef.current) {
            const rect = playerHeroRef.current.getBoundingClientRect();
            targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height, kind: "heal" });
          }
          for (const c of playerFieldCards) {
            const ref = playerFieldRefs.current[c.uniqueId];
            if (ref) {
              const rect = ref.getBoundingClientRect();
              targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "heal" });
            }
          }
        }

        if (isHasteSpell) {
          for (const c of playerFieldCards) {
            if (c.canAttack) {
              const ref = playerFieldRefs.current[c.uniqueId];
              if (ref) {
                const rect = ref.getBoundingClientRect();
                targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "heal" });
              }
            }
          }
        }

        const startX = arrowStartPos.current.x;
        const startY = arrowStartPos.current.y;
        ctx.lineWidth = 3;
        for (const t of targets) {
          const endX = t.x;
          const endY = t.y;
          if (t.kind === "heal") {
            ctx.strokeStyle = "#4caf50";
            ctx.fillStyle = "#4caf50";
          } else {
            ctx.strokeStyle = "#ff5722";
            ctx.fillStyle = "#ff5722";
          }

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
          ctx.fill();
        }
      }
    };

    let id: number;
    const tick = () => {
      drawArrow();
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [draggingCard, dragPosition, playerFieldCards, playerHandCards, enemyFieldCards]);

  // マリガンタイマー
  useEffect(() => {
    // coinResultが"deciding"でない（ルーレット完了後）かつshowCoinPopupがfalse（コイン結果ポップアップ消出後）＝マリガン画面表示時
    if (!preGame || coinResult === "deciding" || showCoinPopup) return;

    if (mulliganTimer <= 0) {
      // タイマー終了→自動で「交換せず開始」を実行
      startMatch();
      setShowGameStart(true);
      setTimeout(() => setShowGameStart(false), 1400);
      return;
    }

    const timer = setTimeout(() => {
      setMulliganTimer(mulliganTimer - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [preGame, coinResult, showCoinPopup, mulliganTimer, setMulliganTimer, startMatch, setShowGameStart]);

  // 敵の移動攻撃 (movingAttack) を受け取って attackClone を生成する
  useEffect(() => {
    if (!movingAttack) return;
    const { attackerId, targetId } = movingAttack;

    // 攻撃元要素 (敵フィールド) と攻撃先要素 (プレイヤー側) を参照
    const sourceEl = enemyFieldRefs.current[attackerId];
    const targetEl = targetId === 'hero' ? playerHeroRef.current : playerFieldRefs.current[targetId];
    if (!sourceEl || !targetEl) return;

    const start = sourceEl.getBoundingClientRect();
    const end = targetEl.getBoundingClientRect();

    // カードデータを取得
    const card = enemyFieldCards.find(c => c.uniqueId === attackerId);
    if (!card) return;

    // duration は見た目の調整
    const duration = 700;

    // setAttackClone を使って移動アニメを開始
    setAttackClone({
      key: `${attackerId}-${Date.now()}`,
      start,
      end,
      card: {
        name: card.name,
        attack: card.attack,
        hp: card.hp,
        maxHp: card.maxHp,
        image: (card as any).image,
      },
      started: false,
      duration,
    });

    // トランジション開始を次のtickで実行して transform をアニメーションさせる
    const t1 = setTimeout(() => {
      setAttackClone((prev: any) => prev ? { ...prev, started: true } : prev);
    }, 50);

    // 即時ダメージフロートを出す（攻撃と同時に視認できるように）
    try {
      const dmg = card.attack ?? 0;
      const targetRect = end;
      const x = targetRect.left + targetRect.width / 2;
      const y = targetRect.top + targetRect.height / 2;
      // setDamageFloats は props で渡されるので既存の配列に新しいフロートを追加
      setDamageFloats([...damageFloats, { id: `attack-${Date.now()}`, target: targetId === 'hero' ? 'playerHero' : (targetId as string), amount: dmg, x, y }]);
    } catch (e) {
      console.warn('[GameField] failed to show immediate damage float', e);
    }

    // 終了後にクリーンアップ
    const t2 = setTimeout(() => {
      setAttackClone(null);
    }, duration + 120);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setAttackClone(null);
    };
  }, [movingAttack, enemyFieldRefs, playerFieldRefs, playerHeroRef, enemyFieldCards, setAttackClone]);

  const isLocal = process.env.NODE_ENV !== 'production';
  const basePath = process.env.NODE_ENV === 'production' ? '/Game' : '';
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75; // 再生速度を0.75倍に設定
    }
  }, []);


    const isTimerActive = !preGame &&       // プリゲーム中でない
                          !showTurnModal &&   // ターン切り替えモーダル中でない
                          !showGameStart &&   // ゲームスタートモーダル中でない
                          !gameOver.over;     // ゲームオーバー中でない


  // ゲーム画面のメイン
  return (
    <div className={`${styles.field} ${isLocal ? styles.field_local : ""}`}>

      {/* <div className={styles.field_bg}>
        <video
          ref={videoRef}
          src={`${basePath}/img/field/bg.mp4`}
          autoPlay
          muted
          loop
          playsInline
        ></video>
      </div> */}

      {/* ダメージフロート */}
      <DamageFloater floats={damageFloats} />

      {/* プリゲーム */}
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
            // ルーレットアニメーション終了後、遅延を入れてから処理
            setTimeout(() => {
              const winner = Math.random() < 0.5 ? "player" : "enemy";
              finalizeCoin(winner as "player" | "enemy");
              setRouletteRunning(false);
              // コイン結果をポップアップで表示
              setShowCoinPopup(true);
              // 2秒後にコイン結果を消してマリガン画面に遷移
              setTimeout(() => {
                setShowCoinPopup(false);
              }, 2000);
            }, 100);
          }}
          onSwapToggle={(cardId: string) => {
            setSwapIds(swapIds.includes(cardId) ? swapIds.filter(id => id !== cardId) : [...swapIds, cardId]);
          }}
          onMulliganSubmit={() => {
            // マリガン実行
            const keep = playerHandCards.filter(c => !swapIds.includes(c.uniqueId)).map(c => c.uniqueId);
            doMulligan(keep);
            setShowCoinPopup(false);
            setTimeout(() => {
              startMatch();
              setShowGameStart(true);
              setTimeout(() => setShowGameStart(false), 1400);
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

      {/* Canvas 矢印 */}
      <canvas ref={canvasRef} style={{ position: "fixed", left: 0, top: 0, pointerEvents: "none", zIndex: 900 }} />

      {/* ドラッグ中のカード表示 */}
      {draggingCard && (() => {
        const card = playerHandCards.find(c => c.uniqueId === draggingCard) || playerFieldCards.find(c => c.uniqueId === draggingCard);
        if (!card) return null;

        const cardWidth = 70;
        const cardHeight = 100;

        // scale the drag preview to match viewport scale so it aligns visually with scaled content
        let s = 1;
        if (typeof window !== 'undefined') {
          const DESIGN_W = 1280;
          const DESIGN_H = 720;
          s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
        }
        const displayW = Math.max(28, Math.round(cardWidth * s));
        const displayH = Math.max(40, Math.round(cardHeight * s));

        const clone = (
          <div
            style={{
              position: 'fixed',
              left: dragPosition.x,
              top: dragPosition.y,
              width: displayW,
              height: displayH,
              zIndex: 1600,
              pointerEvents: 'none',
              opacity: 0.98,
              transform: 'scale(1.12)',
              transition: 'transform 120ms ease',
            }}
            className={styles.drag_clone}
          >
            <CardItem
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              className={styles.drag_clone_card}
              style={{ width: displayW, height: displayH, paddingTop: 0 }}
            />
          </div>
        );

        const portal = createPortal(clone, document.body);
        if (DEBUG) pushDebug('render clone', { id: draggingCard, pos: dragPosition });
        return portal;
      })()}

      {/* Debug HUD (visible when __GAME_DRAG_DEBUG__ = true) */}
      {/* Debug toggle (visible always, toggles global flag) */}
      <div style={{ position: 'fixed', left: 6, bottom: 6, zIndex: 99999, fontSize: 12, color: '#fff', pointerEvents: 'auto' }}>
        <button onClick={() => { const current = (window as any).__GAME_DRAG_DEBUG__ === true; (window as any).__GAME_DRAG_DEBUG__ = !current; pushDebug(`debug ${(current ? 'disabled' : 'enabled')} via UI`, {}); }} style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}>🐞</button>
      </div>

      {/* Debug HUD (visible when __GAME_DRAG_DEBUG__ = true) */}
      {(typeof window !== 'undefined' && (window as any).__GAME_DRAG_DEBUG__ === true) && (
        <div style={{ position: 'fixed', left: 6, bottom: 48, zIndex: 99999, fontSize: 11, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 6, maxWidth: 360, maxHeight: 220, overflow: 'auto', pointerEvents: 'none' }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4, opacity: 0.9 }}>drag-debug</div>
          {debugEvents.map((ev, i) => (
            <div key={ev.t + '-' + i} style={{ opacity: 0.95, marginBottom: 3 }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{new Date(ev.t).toLocaleTimeString()}</div>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.text} {ev.data ? JSON.stringify(ev.data) : ''}</div>
            </div>
          ))}
        </div>
      )}

      {/* メニューボタン */}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1200, display: 'flex', gap: 8 }}>
        <button onClick={() => { resetGame('cpu'); }}>リスタート</button>
        <button onClick={() => { resetGame('cpu'); }}>リタイア</button>
      </div>

      {/* AI攻撃アニメーション */}
      {attackClone && (() => {
        const { start, end, card, started, duration } = attackClone;
        const deltaX = end.left - start.left;
        const deltaY = end.top - start.top;
        const baseStyle: React.CSSProperties = {
          position: "fixed",
          left: start.left,
          top: start.top,
          width: start.width,
          height: start.height,
          transform: started ? `translate(${deltaX}px, ${deltaY}px)` : "translate(0px, 0px)",
          transition: `transform ${duration}ms ease, opacity ${Math.max(200, duration / 3)}ms ease`,
          zIndex: 980,
          pointerEvents: "none",
          opacity: started ? 0.95 : 1,
        };

        return (
          <div style={baseStyle} className={styles.card}>
            {card.image && <img src={card.image} alt={card.name} />}
            <div className={styles.card_hp}><p>{Math.min(card.hp ?? 0, card.maxHp ?? 0)}</p></div>
            <div className={styles.card_attack}><p>{card.attack ?? 0}</p></div>
          </div>
        );
      })()}

      {/* ターンモーダル */}
      {showTurnModal && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 20, borderRadius: 12 }}>
            <h1 style={{ fontSize: 45, margin: 0 }}>{isPlayerTurn ? "Your Turn" : "Enemy Turn"}</h1>
          </div>
        </div>
      )}

      {/* GameStart 表示 */}
      {showGameStart && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 40, borderRadius: 12 }}>
            <h1 style={{ fontSize: 72, margin: 0 }}>GameStart</h1>
          </div>
        </div>
      )}

      {/* 敵エリア */}
      <EnemyArea
        enemyHeroHp={enemyHeroHp}
        enemyHandCards={enemyHandCards}
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
        onDragOver={(e) => {
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const isHeal = handCard && handCard.effect === "heal_single";
          if (draggingCard && (!isHeal || !handCard)) e.preventDefault();
        }}
        onDrop={(targetId) => {
          if (!draggingCard) return;
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          if (handCard && handCard.type === "spell") {
            castSpell(draggingCard, targetId, true);
          } else {
            attack(draggingCard, targetId, true);
          }
          setDraggingCard(null);
          arrowStartPos.current = null;
          dragOffsetRef.current = { x: 0, y: 0 };

          // visual feedback for drop success
          if (targetId === 'hero') {
            setDropSuccess({ type: 'enemyHero' });
          } else {
            setDropSuccess({ type: 'enemyCard', id: targetId });
          }
          setTimeout(() => setDropSuccess({ type: null }), 500);
        }}
        onCardClick={(cardId: string) => setDescCardId(descCardId === cardId ? null : cardId)}
        enemyHeroRef={enemyHeroRef}
        enemyFieldRefs={enemyFieldRefs}
        enemyTimerRef={enemyTimerRef}
        isTimerActive={isTimerActive}
        enemyTurnTimer={enemyTurnTimer}
      />

      {/* プレイヤーエリア */}
      <PlayerArea
        playerHeroHp={playerHeroHp}
        playerHandCards={playerHandCards}
        playerFieldCards={playerFieldCards}
        playerDeck={deck}
        playerGraveyard={playerGraveyard}
        currentMana={currentMana}
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
        setIsHandExpanded={setIsHandExpanded}
        setActiveHandCardId={setActiveHandCardId}
        setDescCardId={setDescCardId}
        setSwapIds={setSwapIds}
        setDraggingCard={setDraggingCard}
        setDragPosition={setDragPosition}
        setArrowStartPos={(pos) => { arrowStartPos.current = pos; }}
        onDragStart={(card, e) => {
          if (!isPlayerTurn) return;
          try {
            // Suppress browser drag ghost and ensure the drag carries an identifier
            e.dataTransfer?.setData('text/plain', card.uniqueId);
            e.dataTransfer?.setDragImage(new Image(), 0, 0);
          } catch (err) { /* ignore for browsers that restrict dataTransfer */ }

          const rect = e.currentTarget.getBoundingClientRect();
          const startCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          // store pointer offset relative to top-left so the grabbed point stays under pointer
          const offset = { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top };
          (dragOffsetRef as any).current = offset;
          setDraggingCard(card.uniqueId);
          arrowStartPos.current = startCenter;
          setDragPosition({ x: (e as any).clientX - offset.x, y: (e as any).clientY - offset.y });
        }}
        onDragEnd={() => {
          setDraggingCard(null);
          arrowStartPos.current = null;
          dragOffsetRef.current = { x: 0, y: 0 };
        }}
        onDragOver={(e) => {
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const isHeal = handCard && handCard.effect === "heal_single";
          if (draggingCard && isHeal) e.preventDefault();
        }}
        onDrop={(card) => {
          if (!draggingCard) return;
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const isHeal = handCard && handCard.effect === "heal_single";
          if (handCard && handCard.type === "spell" && isHeal) {
            castSpell(draggingCard, card?.uniqueId || "hero", true);
          }
          setDraggingCard(null);
          arrowStartPos.current = null;
          dragOffsetRef.current = { x: 0, y: 0 };
        }}
        onPlayerFieldDrop={() => {
          if (!draggingCard) return;
          const card = playerHandCards.find((c) => c.uniqueId === draggingCard);
          if (!card) return;
          if (preGame && coinResult !== 'deciding') {
            setSwapIds(swapIds.includes(card.uniqueId) ? swapIds.filter(id => id !== card.uniqueId) : [...swapIds, card.uniqueId]);
          } else if (card.type !== "spell") {
            playCardToField(card);
          }
          setDraggingCard(null);
          arrowStartPos.current = null;
          dragOffsetRef.current = { x: 0, y: 0 };
        }}
        onCardClick={(cardId: string) => setDescCardId(descCardId === cardId ? null : cardId)}
        onCardSwap={(cardId: string) => {
          setSwapIds(swapIds.includes(cardId) ? swapIds.filter(id => id !== cardId) : [...swapIds, cardId]);
        }}
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
      />

      {/* ターンエンドボタン */}
      <div className={styles.field_turn_wrapper}>
        <div className={styles.field_turn}>
          <button
            onClick={() => endTurn()}
            disabled={
              !isPlayerTurn || 
              aiRunning || 
              preGame ||           
              showGameStart        
            }
            // 緊迫状態のクラスを適用
            className={isTimeCritical ? styles.field_turn_end_critical : ''} // <--- ここを修正
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

      {/* ゲーム終了 */}
      {gameOver.over && (
        <GameOver
          winner={gameOver.winner}
          onRestart={() => resetGame("cpu")}
          onMenu={() => {}}
        />
      )}
    </div>
  );
};
