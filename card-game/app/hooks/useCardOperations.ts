// カード操作に関するフック
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
import { cards } from "../data/cards";
import { MAX_FIELD_SIZE, MAX_HAND } from "../constants/gameConstants";
import { addCardToHand, createUniqueCard, createFieldCard } from "../services/cardService";
import { castSpell } from "../services/spellService";

interface UseCardOperationsProps {
  deck: Card[];
  setDeck: React.Dispatch<React.SetStateAction<Card[]>>;
  playerHandCards: Card[];
  setPlayerHandCards: React.Dispatch<React.SetStateAction<Card[]>>;
  playerFieldCards: RuntimeCard[];
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  playerGraveyard: Card[];
  setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  enemyHandCards: Card[];
  setEnemyHandCards: React.Dispatch<React.SetStateAction<Card[]>>;
  enemyFieldCards: RuntimeCard[];
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  enemyGraveyard: Card[];
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  currentMana: number;
  setCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  enemyCurrentMana: number;
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  playerHeroHp: number;
  setPlayerHeroHp: React.Dispatch<React.SetStateAction<number>>;
  enemyHeroHp: number;
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>;
  stopTimer: () => void;
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>;
  addCardToDestroying: (cardIds: string[]) => void;
}

export function useCardOperations({
  deck,
  setDeck,
  playerHandCards,
  setPlayerHandCards,
  playerFieldCards,
  setPlayerFieldCards,
  playerGraveyard,
  setPlayerGraveyard,
  enemyHandCards,
  setEnemyHandCards,
  enemyFieldCards,
  setEnemyFieldCards,
  enemyGraveyard,
  setEnemyGraveyard,
  currentMana,
  setCurrentMana,
  enemyCurrentMana,
  setEnemyCurrentMana,
  playerHeroHp,
  setPlayerHeroHp,
  enemyHeroHp,
  setEnemyHeroHp,
  setGameOver,
  stopTimer,
  setAiRunning,
  addCardToDestroying,
}: UseCardOperationsProps) {
  const drawPlayerCard = useCallback(() => {
    if (deck.length === 0) return;
    const card = createUniqueCard(deck[0]);
    setDeck((prev) => prev.slice(1));
    addCardToHand(card, playerHandCards, setPlayerHandCards, playerGraveyard, setPlayerGraveyard);
  }, [deck, playerHandCards, playerGraveyard, setDeck, setPlayerHandCards, setPlayerGraveyard]);

  const drawEnemyCard = useCallback(() => {
    // この関数はenemyDeckが必要なので、propsに追加する必要がある
    // 現時点では簡略化
  }, []);

  const playCardToField = useCallback((card: Card) => {
    if (card.type === "spell") {
      console.log("スペルはフィールドに出せません。ターゲットにドロップして使用してください。");
      return;
    }

    if (playerFieldCards.length >= MAX_FIELD_SIZE) {
      console.log("フィールドは最大5体までです。");
      return;
    }

    if (card.cost > currentMana) {
      console.log("マナが足りません！");
      return;
    }
    setCurrentMana((m) => m - card.cost);

    const canAttack = !!(card.rush || card.superHaste);
    const fieldCard = createFieldCard(card, canAttack);
    setPlayerFieldCards((f) => [...f, fieldCard]);
    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));

    // アニメーション終了
    setTimeout(() => {
      setPlayerFieldCards((list) =>
        list.map((c) => (c.uniqueId === card.uniqueId ? { ...c, isAnimating: false } : c))
      );
    }, 600);

    // 召喚時効果の発動
    if (card.summonEffect) {
      const se = card.summonEffect;
      if (se.type === "damage_all" && (se.value ?? 0) > 0) {
        const dmg = se.value ?? 1;
        setEnemyFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) {
            addCardToDestroying(dead.map(d => d.uniqueId));
            setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
          }
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
        setEnemyHeroHp((h) => {
          const next = Math.max(h - dmg, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "player" });
            try { stopTimer(); } catch (e) { /* ignore */ }
            setAiRunning(false);
          }
          return next;
        });
      }
    }

    // 召喚時トリガーの発動
    if (card.summonTrigger) {
      const trigger = card.summonTrigger;
      if (trigger.type === "add_card_hand" && trigger.cardId) {
        const addCard = cards.find((c) => c.id === trigger.cardId);
        if (addCard) {
          const newCard = createUniqueCard(addCard);
          setPlayerHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
        }
      }
    }
  }, [playerFieldCards, currentMana, setCurrentMana, setPlayerFieldCards, setPlayerHandCards, setEnemyFieldCards, setEnemyGraveyard, setEnemyHeroHp, setGameOver, stopTimer, setAiRunning, addCardToDestroying]);

  const handleCastSpell = useCallback((
    cardUniqueId: string,
    targetId: string | "hero",
    isPlayer: boolean = true,
    setAttackTargets?: (targets: string[]) => void
  ) => {
    const card = isPlayer
      ? playerHandCards.find((c) => c.uniqueId === cardUniqueId)
      : enemyHandCards.find((c) => c.uniqueId === cardUniqueId);
    if (!card || card.type !== "spell") return;

    const currentManaToUse = isPlayer ? currentMana : enemyCurrentMana;
    if (card.cost > currentManaToUse) {
      console.log("マナが足りません（spell）");
      return;
    }

    if (isPlayer) {
      setCurrentMana((m) => m - card.cost);
    } else {
      setEnemyCurrentMana((m) => m - card.cost);
    }

    castSpell(card, targetId, isPlayer, {
      playerFieldCards,
      enemyFieldCards,
      setPlayerFieldCards,
      setEnemyFieldCards,
      setPlayerHeroHp,
      setEnemyHeroHp,
      setPlayerGraveyard,
      setEnemyGraveyard,
      setGameOver,
      stopTimer,
      setAiRunning,
      addCardToDestroying,
    });

    // 手札から除去して墓地へ
    if (isPlayer) {
      setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
      setPlayerGraveyard((g) => [...g, createUniqueCard(card)]);
    } else {
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
      setEnemyGraveyard((g) => [...g, createUniqueCard(card)]);
    }

    setAttackTargets?.([]);
  }, [playerHandCards, enemyHandCards, currentMana, enemyCurrentMana, setCurrentMana, setEnemyCurrentMana, playerFieldCards, enemyFieldCards, setPlayerFieldCards, setEnemyFieldCards, setPlayerHeroHp, setEnemyHeroHp, setPlayerHandCards, setEnemyHandCards, setPlayerGraveyard, setEnemyGraveyard, setGameOver, stopTimer, setAiRunning, addCardToDestroying]);

  return {
    drawPlayerCard,
    drawEnemyCard,
    playCardToField,
    castSpell: handleCastSpell,
  };
}
