"use client";

import { useEffect, useRef } from "react";
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
import type { DamageFloat } from "./useGameUI";

interface UseDamageMonitorProps {
  preGame: boolean;
  playerHeroHp: number;
  enemyHeroHp: number;
  playerFieldCards: RuntimeCard[];
  enemyFieldCards: RuntimeCard[];
  damageFloats: DamageFloat[];
  setDamageFloats: (floats: DamageFloat[]) => void;
  playerHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  enemyHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  playerFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  enemyFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
}

export function useDamageMonitor({
  preGame,
  playerHeroHp,
  enemyHeroHp,
  playerFieldCards,
  enemyFieldCards,
  damageFloats,
  setDamageFloats,
  playerHeroRef,
  enemyHeroRef,
  playerFieldRefs,
  enemyFieldRefs,
}: UseDamageMonitorProps) {
  const prevPlayerHeroHp = useRef<number>(playerHeroHp);
  const prevEnemyHeroHp = useRef<number>(enemyHeroHp);
  const prevFieldHp = useRef<{ [id: string]: number }>({});

  useEffect(() => {
    if (preGame) {
      // コイントス/初期化によるHP更新ではダメージ表示を出さない
      prevPlayerHeroHp.current = playerHeroHp;
      prevEnemyHeroHp.current = enemyHeroHp;
      return;
    }

    const newFloats: DamageFloat[] = [];

    if (playerHeroHp < prevPlayerHeroHp.current && playerHeroRef.current) {
      const rect = playerHeroRef.current.getBoundingClientRect();
      const amount = prevPlayerHeroHp.current - playerHeroHp;
      newFloats.push({
        id: `playerHero-${Date.now()}`,
        target: "playerHero",
        amount,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }

    if (enemyHeroHp < prevEnemyHeroHp.current && enemyHeroRef.current) {
      const rect = enemyHeroRef.current.getBoundingClientRect();
      const amount = prevEnemyHeroHp.current - enemyHeroHp;
      newFloats.push({
        id: `enemyHero-${Date.now()}`,
        target: "enemyHero",
        amount,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }

    prevPlayerHeroHp.current = playerHeroHp;
    prevEnemyHeroHp.current = enemyHeroHp;

    const checkFieldHp = (
      fieldCards: RuntimeCard[],
      fieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
    ) => {
      fieldCards.forEach((c) => {
        const prev = prevFieldHp.current[c.uniqueId];
        if (prev !== undefined && c.hp !== undefined && c.hp < prev) {
          const ref = fieldRefs.current[c.uniqueId];
          if (ref) {
            const rect = ref.getBoundingClientRect();
            newFloats.push({
              id: `${c.uniqueId}-${Date.now()}`,
              target: c.uniqueId,
              amount: prev - (c.hp ?? 0),
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          }
        }
        prevFieldHp.current[c.uniqueId] = c.hp ?? 0;
      });
    };

    checkFieldHp(playerFieldCards, playerFieldRefs);
    checkFieldHp(enemyFieldCards, enemyFieldRefs);

    // remove entries for cards no longer on the field
    Object.keys(prevFieldHp.current).forEach((id) => {
      if (!playerFieldCards.some((c) => c.uniqueId === id) && !enemyFieldCards.some((c) => c.uniqueId === id)) {
        delete prevFieldHp.current[id];
      }
    });

    if (newFloats.length > 0) {
      setDamageFloats([...damageFloats, ...newFloats]);
    }
  }, [preGame, playerHeroHp, enemyHeroHp, playerFieldCards, enemyFieldCards, setDamageFloats, playerHeroRef, enemyHeroRef, playerFieldRefs, enemyFieldRefs]);
}
