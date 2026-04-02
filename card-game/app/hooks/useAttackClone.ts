"use client";

import { useEffect } from "react";
import type { Card } from "../data/cards";
import type { DamageFloat } from "./useGameUI";

interface UseAttackCloneProps {
  movingAttack: { attackerId: string; targetId: string | "hero" } | null;
  enemyFieldCards: (Card & { maxHp: number })[];
  enemyFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  playerFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  playerHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  attackClone: any;
  setAttackClone: (clone: any) => void;
  damageFloats: DamageFloat[];
  setDamageFloats: (floats: DamageFloat[]) => void;
}

export function useAttackClone({
  movingAttack,
  enemyFieldCards,
  enemyFieldRefs,
  playerFieldRefs,
  playerHeroRef,
  setAttackClone,
  damageFloats,
  setDamageFloats,
}: UseAttackCloneProps) {
  useEffect(() => {
    if (!movingAttack) return;
    const { attackerId, targetId } = movingAttack;

    const sourceEl = enemyFieldRefs.current[attackerId];
    const targetEl = targetId === "hero" ? playerHeroRef.current : playerFieldRefs.current[targetId];
    if (!sourceEl || !targetEl) return;

    const start = sourceEl.getBoundingClientRect();
    const end = targetEl.getBoundingClientRect();

    const card = enemyFieldCards.find((c) => c.uniqueId === attackerId);
    if (!card) return;

    const duration = 700;

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

    const t1 = setTimeout(() => {
      setAttackClone((prev: any) => (prev ? { ...prev, started: true } : prev));
    }, 50);

    try {
      const dmg = card.attack ?? 0;
      setDamageFloats([
        ...damageFloats,
        {
          id: `attack-${Date.now()}`,
          target: targetId === "hero" ? "playerHero" : (targetId as string),
          amount: dmg,
          x: end.left + end.width / 2,
          y: end.top + end.height / 2,
        },
      ]);
    } catch {}

    const t2 = setTimeout(() => setAttackClone(null), duration + 120);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setAttackClone(null);
    };
  }, [movingAttack, enemyFieldRefs, playerFieldRefs, playerHeroRef, enemyFieldCards, setAttackClone]);
}
