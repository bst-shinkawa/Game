"use client";

import { useState, useRef, useEffect } from "react";
import { useCallback } from "react";

/**
 * ゲーム画面のUI状態を管理するカスタムフック
 * - ダメージフロート
 * - ドラッグ状態
 * - ターンモーダル
 * - カード説明パネル
 * - 手札展開状態
 * - プリゲーム状態
 */
export interface DamageFloat {
  id: string;
  target: string;
  amount: number;
  x: number;
  y: number;
}

export function useGameUI() {
  // ダメージフロート
  const [damageFloats, setDamageFloats] = useState<DamageFloat[]>([]);

  // ドラッグ状態
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [arrowStartPos, setArrowStartPos] = useState<{ x: number; y: number } | null>(null);

  // ターンモーダル
  const [showTurnModal, setShowTurnModal] = useState<boolean>(false);

  // カード説明パネル
  const [descCardId, setDescCardId] = useState<string | null>(null);

  // 手札展開状態
  const [isHandExpanded, setIsHandExpanded] = useState<boolean>(false);
  const [activeHandCardId, setActiveHandCardId] = useState<string | null>(null);
  const handAreaRef = useRef<HTMLDivElement>(null);

  // プリゲーム状態
  const [rouletteRunning, setRouletteRunning] = useState<boolean>(false);
  const [rouletteLabel, setRouletteLabel] = useState<string>("...");
  const [showCoinPopup, setShowCoinPopup] = useState<boolean>(false);
  const [swapIds, setSwapIds] = useState<string[]>([]);
  const [mulliganTimer, setMulliganTimer] = useState<number>(15);
  const [keepIds, setKeepIds] = useState<string[]>([]);
  const [showGameStart, setShowGameStart] = useState<boolean>(false);

  // 敵AI行動の演出状態
  const [enemyActionEffect, setEnemyActionEffect] = useState<{
    type: "follower_summon" | "spell_cast" | "attack" | "turn_end" | null;
    intensity: number; // 0-1
  }>({ type: null, intensity: 0 });

  // 攻撃アニメーション
  const [attackClone, setAttackClone] = useState<null | {
    key: string;
    start: DOMRect;
    end: DOMRect;
    card: { name?: string; attack?: number; hp?: number; maxHp?: number; image?: string };
    started: boolean;
    duration: number;
  }>(null);

  // ダメージフロート追加
  const showDamage = useCallback((target: string, amount: number, x: number, y: number) => {
    setDamageFloats((prev) => [
      ...prev,
      { id: `${target}-${Date.now()}`, target, amount, x, y }
    ]);
  }, []);

  // 手札縮小
  const collapseHand = useCallback(() => {
    setIsHandExpanded(false);
    setActiveHandCardId(null);
  }, []);

  // 手札エリア外クリック処理
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isHandExpanded && handAreaRef.current && !handAreaRef.current.contains(event.target as Node)) {
        collapseHand();
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isHandExpanded, collapseHand]);

  // ダメージフロート自動消去
  useEffect(() => {
    if (damageFloats.length === 0) return;
    const timer = setTimeout(() => {
      setDamageFloats((prev) => prev.slice(1));
    }, 800);
    return () => clearTimeout(timer);
  }, [damageFloats]);

  return {
    // ダメージフロート
    damageFloats,
    setDamageFloats,
    showDamage,

    // ドラッグ
    draggingCard,
    setDraggingCard,
    dragPosition,
    setDragPosition,
    arrowStartPos,
    setArrowStartPos,

    // ターンモーダル
    showTurnModal,
    setShowTurnModal,

    // カード説明
    descCardId,
    setDescCardId,

    // 手札
    isHandExpanded,
    setIsHandExpanded,
    activeHandCardId,
    setActiveHandCardId,
    handAreaRef,
    collapseHand,

    // プリゲーム
    rouletteRunning,
    setRouletteRunning,
    rouletteLabel,
    setRouletteLabel,
    showCoinPopup,
    setShowCoinPopup,
    swapIds,
    setSwapIds,
    mulliganTimer,
    setMulliganTimer,
    keepIds,
    setKeepIds,
    showGameStart,
    setShowGameStart,

    // 攻撃アニメ
    attackClone,
    setAttackClone,

    // 敵AI行動演出
    enemyActionEffect,
    setEnemyActionEffect,
  };
}
