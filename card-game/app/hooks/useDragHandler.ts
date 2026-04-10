"use client";

/**
 * ドラッグ＆矢印プレビュー用の集約フック。
 * 将来的に Framer Motion の drag / useDragControls で一部を置き換える余地はあるが、
 * HTML5 DnD・タッチ・手札展開との兼ね合いで大規模リファクタが必要なため現状は維持する。
 */
import { useEffect, useRef, useState, useContext, useCallback } from "react";
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
// RuntimeCard is now used in the interface definitions below
import styles from "../assets/css/Game.Master.module.css";
import ViewportContext from "../context/ViewportContext";

interface DragRefs {
  enemyHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  playerHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  playerBattleRef: React.MutableRefObject<HTMLDivElement | null>;
}

interface DragActions {
  attack: (attackerId: string, targetId: string | "hero", isPlayerAttacker?: boolean) => void;
  setSwapIds: React.Dispatch<React.SetStateAction<string[]>>;
  /** プレイヤーフィールドへのドロップを統一的に処理するコールバック。cardId を引数で渡す（stale closure 回避）*/
  onPlayerFieldDrop: (cardId: string) => void;
}

interface UseDragHandlerProps {
  playerHandCards: Card[];
  playerFieldCards: RuntimeCard[];
  enemyFieldCards: RuntimeCard[];
  isPlayerTurn: boolean;
  preGame: boolean;
  coinResult: string;
  swapIds: string[];
  /** 手札クリックで対象選択中はドラッグ検出に乗せない（クリックが効かなくなるのを防ぐ） */
  selectionMode?: "none" | "select_target" | "select_hand_card";
  draggingCard: string | null;
  setDraggingCard: (id: string | null) => void;
  setDragPosition: (pos: { x: number; y: number }) => void;
  refs: DragRefs;
  actions: DragActions;
}

export function useDragHandler({
  playerHandCards,
  playerFieldCards,
  enemyFieldCards,
  isPlayerTurn,
  preGame,
  coinResult,
  swapIds,
  selectionMode = "none",
  draggingCard,
  setDraggingCard,
  setDragPosition,
  refs,
  actions,
}: UseDragHandlerProps) {
  const viewport = useContext(ViewportContext);
  const [hoverTarget, setHoverTarget] = useState<{ type: string | null; id?: string | null }>({ type: null });
  const [dropSuccess, setDropSuccess] = useState<{ type: string | null; id?: string | null }>({ type: null });
  const [attackTargets, setAttackTargets] = useState<string[]>([]);
  const lastAttackTargetsRef = useRef<string[]>([]);

  const dragPendingRef = useRef<{ x: number; y: number; dx?: number; dy?: number } | null>(null);
  const dragDesignRef = useRef<{ x: number; y: number } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const arrowStartPos = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const monitorTimerRef = useRef<number | null>(null);

  const clientToDesign = useCallback((cx: number, cy: number) => {
    if (!viewport || !viewport.scale) return null;
    const dx = (cx - (viewport.containerLeft || 0)) / (viewport.scale || 1);
    const dy = (cy - (viewport.containerTop || 0)) / (viewport.scale || 1);
    return { x: Math.round(dx), y: Math.round(dy) };
  }, [viewport]);

  const stopMonitor = useCallback(() => {
    if (monitorTimerRef.current != null) {
      clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
  }, []);

  // Drag tracking: mouse/touch position → hover target
  useEffect(() => {
    if (!draggingCard) {
      setHoverTarget({ type: null });
      return;
    }

    const scheduleFlush = () => {
      if (dragRafRef.current != null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        if (dragPendingRef.current) {
          const pos = {
            x: dragPendingRef.current.x - dragOffsetRef.current.x,
            y: dragPendingRef.current.y - dragOffsetRef.current.y,
          };
          setDragPosition(pos);
          try {
            const el = document.elementFromPoint(dragPendingRef.current.x, dragPendingRef.current.y) as HTMLElement | null;
            if (el) {
              const enemyHeroEl = el.closest("." + styles.field_enemy_hero);
              const playerHeroEl = el.closest("." + styles.field_player_hero);
              const enemyBattleEl = el.closest("." + styles.field_enemy_battle);
              const playerBattleEl = el.closest("." + styles.field_player_battle);
              const cardEl = el.closest("[data-uniqueid]") as HTMLElement | null;

              // 手札カードをドラッグ中は敵ユニットのハイライトをしない（スペルのD&D誤ハイライト防止）
              const isDraggingHandCard = playerHandCards.some((c) => c.uniqueId === draggingCard);

              if (enemyHeroEl && !isDraggingHandCard) setHoverTarget({ type: "enemyHero" });
              else if (playerHeroEl) setHoverTarget({ type: "playerHero" });
              else if (cardEl && enemyBattleEl && !isDraggingHandCard) setHoverTarget({ type: "enemyCard", id: cardEl.getAttribute("data-uniqueid") });
              else if (cardEl && playerBattleEl) setHoverTarget({ type: "playerCard", id: cardEl.getAttribute("data-uniqueid") });
              else if (playerBattleEl) setHoverTarget({ type: "playerBattle" });
              else if (enemyBattleEl && !isDraggingHandCard) setHoverTarget({ type: "enemyBattle" });
              else setHoverTarget({ type: null });
            } else {
              setHoverTarget({ type: null });
            }
          } catch {
            setHoverTarget({ type: null });
          }
          dragPendingRef.current = null;
        }
        dragRafRef.current = null;
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      let dx, dy;
      if (viewport?.scale) {
        dx = Math.round((cx - (viewport.containerLeft || 0)) / (viewport.scale || 1));
        dy = Math.round((cy - (viewport.containerTop || 0)) / (viewport.scale || 1));
      }
      dragPendingRef.current = { x: cx, y: cy, dx, dy };
      scheduleFlush();
    };

    const handleDragOver = (e: DragEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      let dx, dy;
      if (viewport?.scale) {
        dx = Math.round((cx - (viewport.containerLeft || 0)) / (viewport.scale || 1));
        dy = Math.round((cy - (viewport.containerTop || 0)) / (viewport.scale || 1));
      }
      dragPendingRef.current = { x: cx, y: cy, dx, dy };
      scheduleFlush();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("dragover", handleDragOver);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("dragover", handleDragOver);
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      dragPendingRef.current = null;
      dragRafRef.current = null;
      setHoverTarget({ type: null });
    };
  }, [draggingCard, viewport, setDragPosition]);

  // Pointer & touch drag handling
  useEffect(() => {
    let activePointerId: number | null = null;
    let startRect: DOMRect | null = null;
    let pointerOffset = { x: 0, y: 0 };
    let capturedPointerElement: HTMLElement | null = null;
    let capturedPointerId: number | null = null;
    const DRAG_START_THRESHOLD = 6;
    const LONG_PRESS_MS = 180;

    const { attack: attackAction, setSwapIds: setSwapIdsAction, onPlayerFieldDrop: onPlayerFieldDropAction } = actions;
    const { enemyHeroRef, playerHeroRef, playerBattleRef } = refs;

    const beginPotentialDrag = (startX: number, startY: number, el: HTMLElement, id: string, idForPointer?: number | null) => {
      activePointerId = idForPointer ?? null;
      startRect = el.getBoundingClientRect();
      let dragStarted = false;

      const forceStart = () => {
        if (dragStarted) return;
        dragStarted = true;
        try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
        pointerOffset = { x: startX - startRect!.left, y: startY - startRect!.top };
        setDraggingCard(id);
        arrowStartPos.current = { x: startRect!.left + startRect!.width / 2, y: startRect!.top + startRect!.height / 2 };
        setDragPosition({ x: startX - pointerOffset.x, y: startY - pointerOffset.y });
        try { document.body.style.touchAction = "none"; } catch {}
        lastPointerRef.current = { x: startX, y: startY };
      };

      const onMove = (x: number, y: number, preventDefaultIfStarted = true): boolean | false => {
        const dx = x - startX;
        const dy = y - startY;
        if (!dragStarted) {
          if (Math.hypot(dx, dy) > DRAG_START_THRESHOLD) {
            dragStarted = true;
            try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
            pointerOffset = { x: startX - startRect!.left, y: startY - startRect!.top };
            setDraggingCard(id);
            arrowStartPos.current = { x: startRect!.left + startRect!.width / 2, y: startRect!.top + startRect!.height / 2 };
            setDragPosition({ x: x - pointerOffset.x, y: y - pointerOffset.y });
            lastPointerRef.current = { x, y };
            return true;
          }
          return false;
        } else {
          lastPointerRef.current = { x, y };
          setDragPosition({ x: x - pointerOffset.x, y: y - pointerOffset.y });
          return true;
        }
      };

      const finish = () => {
        startRect = null;
        activePointerId = null;
        stopMonitor();
        try { document.body.style.touchAction = ""; } catch {}
        try {
          if (capturedPointerElement && capturedPointerId != null) {
            capturedPointerElement.releasePointerCapture(capturedPointerId);
          }
        } catch {}
        capturedPointerElement = null;
        capturedPointerId = null;
      };

      return { onMove, forceStart, finish };
    };

    const handleDrop = (
      dropEl: HTMLElement | null,
      handCard: Card | undefined,
      fieldCard: (Card & { canAttack?: boolean }) | undefined,
      id: string
    ) => {
      const isDropOnEnemyHero = dropEl && enemyHeroRef.current && (enemyHeroRef.current === dropEl || enemyHeroRef.current.contains(dropEl));
      const dropFieldCardEl = dropEl ? (dropEl.closest("[data-uniqueid]") as HTMLElement | null) : null;
      const dropFieldCardId = dropFieldCardEl?.getAttribute("data-uniqueid") || null;

      if (handCard) {
        // 手札カードはプレイヤーフィールドへのドロップのみ受け付ける
        // スペルはフィールドへドロップ → 選択画面で対象を選ぶ仕様のため、
        // 敵ヒーロー/敵フィールドへの直接ドロップは無効
        const isDropOnPlayerField = dropEl && playerBattleRef.current && (playerBattleRef.current === dropEl || playerBattleRef.current.contains(dropEl));
        if (isDropOnPlayerField) {
          if (preGame && coinResult !== "deciding") {
            setSwapIdsAction((prev) => prev.includes(handCard.uniqueId) ? prev.filter((sid) => sid !== handCard.uniqueId) : [...prev, handCard.uniqueId]);
          } else {
            // cardId を明示的に渡すことで stale closure を回避
            onPlayerFieldDropAction(id);
          }
        }
        // それ以外へのドロップ（敵ヒーロー・敵フィールド・味方ヒーロー・味方フィールドカード）は何もしない
      } else if (fieldCard) {
        // フィールドカードは敵への攻撃のみ
        if (isDropOnEnemyHero) {
          attackAction(fieldCard.uniqueId, "hero", true);
        } else if (dropFieldCardId && enemyFieldCards.some((c) => c.uniqueId === dropFieldCardId)) {
          attackAction(fieldCard.uniqueId, dropFieldCardId, true);
        }
      }

      setDraggingCard(null);
      arrowStartPos.current = null;
      try { document.body.style.touchAction = ""; } catch {}
    };

    const onPointerDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest("[data-uniqueid]") as HTMLElement | null;
      if (!el) return;
      const id = el.getAttribute("data-uniqueid");
      if (!id) return;

      const handCard = playerHandCards.find((c) => c.uniqueId === id);
      const fieldCard = playerFieldCards.find((c) => c.uniqueId === id && c.canAttack);
      if (!handCard && !fieldCard) return;
      if (!isPlayerTurn) return;
      if (
        handCard &&
        (selectionMode === "select_hand_card" || selectionMode === "select_target")
      ) {
        return;
      }

      const startX = e.clientX;
      const startY = e.clientY;
      const pd = beginPotentialDrag(startX, startY, el, id, e.pointerId ?? null);

      try {
        const pid = e.pointerId ?? null;
        if (pid != null && el && (el as any).setPointerCapture) {
          (el as any).setPointerCapture(pid);
          capturedPointerElement = el;
          capturedPointerId = pid;
        }
      } catch {}

      let longPressTimer: number | null = window.setTimeout(() => pd.forceStart(), LONG_PRESS_MS) as unknown as number;

      const moveHandler = (ev: PointerEvent) => {
        if (activePointerId == null || ev.pointerId !== activePointerId) return;
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4 && longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
        if (pd.onMove(ev.clientX, ev.clientY)) {
          if (longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
          ev.preventDefault();
        }
      };

      const cancelHandler = () => {
        if (longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
        document.removeEventListener("pointermove", moveHandler);
        document.removeEventListener("pointerup", upHandler);
        document.removeEventListener("pointercancel", cancelHandler);
        pd.finish();
      };

      const upHandler = (ev: PointerEvent) => {
        if (longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
        if (activePointerId == null || ev.pointerId !== activePointerId) return;
        if (pd.onMove(ev.clientX, ev.clientY, false) === false) {
          document.removeEventListener("pointermove", moveHandler);
          document.removeEventListener("pointerup", upHandler);
          document.removeEventListener("pointercancel", cancelHandler);
          pd.finish();
          return;
        }
        ev.preventDefault();
        const dropEl = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        handleDrop(dropEl, handCard, fieldCard, id);
        document.removeEventListener("pointermove", moveHandler);
        document.removeEventListener("pointerup", upHandler);
        document.removeEventListener("pointercancel", cancelHandler);
        pd.finish();
      };

      document.addEventListener("pointermove", moveHandler);
      document.addEventListener("pointerup", upHandler);
      document.addEventListener("pointercancel", cancelHandler);
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const el = (e.target as HTMLElement).closest("[data-uniqueid]") as HTMLElement | null;
      if (!el) return;
      const id = el.getAttribute("data-uniqueid");
      if (!id) return;

      const handCard = playerHandCards.find((c) => c.uniqueId === id);
      const fieldCard = playerFieldCards.find((c) => c.uniqueId === id && c.canAttack);
      if (!handCard && !fieldCard) return;
      if (!isPlayerTurn) return;
      if (
        handCard &&
        (selectionMode === "select_hand_card" || selectionMode === "select_target")
      ) {
        return;
      }

      const startX = t.clientX;
      const startY = t.clientY;
      const pd = beginPotentialDrag(startX, startY, el, id, null);

      let longPressTimer: number | null = window.setTimeout(() => pd.forceStart(), LONG_PRESS_MS) as unknown as number;

      const touchMove = (ev: TouchEvent) => {
        const t2 = ev.touches[0];
        if (!t2) return;
        if (Math.hypot(t2.clientX - startX, t2.clientY - startY) > 4 && longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
        if (pd.onMove(t2.clientX, t2.clientY)) {
          if (longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
          ev.preventDefault();
        }
      };

      const touchCancel = () => {
        if (longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
        document.removeEventListener("touchmove", touchMove as EventListenerOrEventListenerObject);
        document.removeEventListener("touchend", touchEnd as EventListenerOrEventListenerObject);
        document.removeEventListener("touchcancel", touchCancel as EventListenerOrEventListenerObject);
        pd.finish();
      };

      const touchEnd = (ev: TouchEvent) => {
        if (longPressTimer != null) { clearTimeout(longPressTimer); longPressTimer = null; }
        const t2 = ev.changedTouches[0];
        if (!t2) return;
        if (pd.onMove(t2.clientX, t2.clientY, false) === false) {
          document.removeEventListener("touchmove", touchMove as EventListenerOrEventListenerObject);
          document.removeEventListener("touchend", touchEnd as EventListenerOrEventListenerObject);
          document.removeEventListener("touchcancel", touchCancel as EventListenerOrEventListenerObject);
          pd.finish();
          return;
        }
        const dropEl = document.elementFromPoint(t2.clientX, t2.clientY) as HTMLElement | null;
        handleDrop(dropEl, handCard, fieldCard, id);
        document.removeEventListener("touchmove", touchMove as EventListenerOrEventListenerObject);
        document.removeEventListener("touchend", touchEnd as EventListenerOrEventListenerObject);
        document.removeEventListener("touchcancel", touchCancel as EventListenerOrEventListenerObject);
        pd.finish();
      };

      document.addEventListener("touchmove", touchMove, { passive: false } as any);
      document.addEventListener("touchend", touchEnd as any);
      document.addEventListener("touchcancel", touchCancel as any);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("touchstart", onTouchStart, { passive: false } as any);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("touchstart", onTouchStart as any);
    };
  }, [playerHandCards, playerFieldCards, enemyFieldCards, isPlayerTurn, preGame, coinResult, swapIds, selectionMode, refs, actions, setDraggingCard, setDragPosition, stopMonitor]);

  // Cleanup on drag end
  useEffect(() => {
    if (!draggingCard) {
      stopMonitor();
      try { document.body.style.touchAction = ""; } catch {}
    }
  }, [draggingCard, stopMonitor]);

  return {
    hoverTarget,
    dropSuccess,
    setDropSuccess,
    attackTargets,
    setAttackTargets,
    lastAttackTargetsRef,
    arrowStartPos,
    dragOffsetRef,
    dragDesignRef,
    clientToDesign,
  };
}
