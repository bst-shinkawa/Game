"use client";

import { useEffect, useRef } from "react";
import type { RuntimeCard } from "../types/gameTypes";

interface UseAttackCloneProps {
  movingAttack: { attackerId: string; targetId: string | "hero" } | null;
  playerAttackAnimation: { sourceCardId: string; targetId: string | "hero" } | null;
  enemyFieldCards: RuntimeCard[];
  playerFieldCards: RuntimeCard[];
  enemyFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  playerFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  playerHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  enemyHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  setAttackClone: (clone: unknown) => void;
}

const DURATION_MS = 700;

function cardToClonePayload(card: RuntimeCard) {
  return {
    name: card.name,
    attack: card.attack,
    hp: card.hp,
    maxHp: card.maxHp,
    image: (card as { image?: string }).image,
  };
}

export function useAttackClone({
  movingAttack,
  playerAttackAnimation,
  enemyFieldCards,
  playerFieldCards,
  enemyFieldRefs,
  playerFieldRefs,
  playerHeroRef,
  enemyHeroRef,
  setAttackClone,
}: UseAttackCloneProps) {
  const enemyFieldCardsRef = useRef(enemyFieldCards);
  const playerFieldCardsRef = useRef(playerFieldCards);
  enemyFieldCardsRef.current = enemyFieldCards;
  playerFieldCardsRef.current = playerFieldCards;

  useEffect(() => {
    if (movingAttack) {
      const { attackerId, targetId } = movingAttack;
      const sourceEl = enemyFieldRefs.current[attackerId];
      const targetEl = targetId === "hero" ? playerHeroRef.current : playerFieldRefs.current[targetId];
      if (!sourceEl || !targetEl) return;
      const card = enemyFieldCardsRef.current.find((c) => c.uniqueId === attackerId);
      if (!card) return;
      const start = sourceEl.getBoundingClientRect();
      const end = targetEl.getBoundingClientRect();
      setAttackClone({
        key: `${attackerId}-${Date.now()}`,
        start,
        end,
        card: cardToClonePayload(card),
        duration: DURATION_MS,
      });
      return () => {
        setAttackClone(null);
      };
    }

    if (playerAttackAnimation) {
      const { sourceCardId, targetId } = playerAttackAnimation;
      const sourceEl = playerFieldRefs.current[sourceCardId];
      const targetEl = targetId === "hero" ? enemyHeroRef.current : enemyFieldRefs.current[targetId];
      if (!sourceEl || !targetEl) return;
      const card = playerFieldCardsRef.current.find((c) => c.uniqueId === sourceCardId);
      if (!card) return;
      const start = sourceEl.getBoundingClientRect();
      const end = targetEl.getBoundingClientRect();
      setAttackClone({
        key: `${sourceCardId}-${Date.now()}`,
        start,
        end,
        card: cardToClonePayload(card),
        duration: DURATION_MS,
      });
      return () => {
        setAttackClone(null);
      };
    }

    return undefined;
  }, [movingAttack, playerAttackAnimation, enemyFieldRefs, playerFieldRefs, playerHeroRef, enemyHeroRef, setAttackClone]);
}
