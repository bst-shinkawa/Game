// カード操作に関するフック
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
import { cards } from "../data/cards";
import { MAX_FIELD_SIZE, MAX_HAND } from "../constants/gameConstants";
import { addCardToHand, createUniqueCard, createFieldCard } from "../services/cardService";
import { applySpell, playCardToField as servicePlayCard } from "../services/effectService";

interface UseCardOperationsProps {
  deck: Card[];
  setDeck: React.Dispatch<React.SetStateAction<Card[]>>;
  enemyDeck: Card[];
  setEnemyDeck: React.Dispatch<React.SetStateAction<Card[]>>;
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
  enemyDeck,
  setEnemyDeck,
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
    if (enemyDeck.length === 0) return;
    const card = { ...enemyDeck[0], uniqueId: uuidv4() };
    setEnemyDeck((prev) => prev.slice(1));
    addCardToHand(card, enemyHandCards, setEnemyHandCards, enemyGraveyard, setEnemyGraveyard);
  }, [enemyDeck, enemyHandCards, enemyGraveyard, setEnemyDeck, setEnemyHandCards, setEnemyGraveyard]);

  const drawPlayerCards = useCallback((count: number) => {
    // 複数のプレイヤーカードを一度にドロー
    setDeck((prev) => {
      const cards: Card[] = [];
      let remaining = [...prev];
      for (let i = 0; i < count && remaining.length > 0; i++) {
        cards.push(createUniqueCard(remaining[0]));
        remaining = remaining.slice(1);
      }
      setPlayerHandCards((h) => {
        const newHand = [...h];
        for (const card of cards) {
          if (newHand.length < MAX_HAND) {
            newHand.push(card);
          }
        }
        return newHand;
      });
      return remaining;
    });
  }, [deck, playerHandCards, setDeck, setPlayerHandCards]);

  const drawEnemyCards = useCallback((count: number) => {
    // 複数の敵カードを一度にドロー
    setEnemyDeck((prev) => {
      const cards: Card[] = [];
      let remaining = [...prev];
      for (let i = 0; i < count && remaining.length > 0; i++) {
        cards.push({ ...remaining[0], uniqueId: uuidv4() });
        remaining = remaining.slice(1);
      }
      setEnemyHandCards((h) => {
        const newHand = [...h];
        for (const card of cards) {
          if (newHand.length < MAX_HAND) {
            newHand.push(card);
          }
        }
        return newHand;
      });
      return remaining;
    });
  }, [enemyDeck, enemyHandCards, setEnemyDeck, setEnemyHandCards]);

  const playCardToField = useCallback((card: Card) => {
      // delegate to effectService; effectService will handle mana checks, field limits, summon effects, triggers, and card-specific logic
      servicePlayCard(card, true, {
        playerFieldCards,
        setPlayerFieldCards,
        playerHandCards,
        enemyHandCards,
        setPlayerHandCards,
        setEnemyHandCards,
        enemyFieldCards,
        setEnemyFieldCards,
        playerGraveyard,
        setPlayerGraveyard,
        enemyGraveyard,
        setEnemyGraveyard,
        setPlayerHeroHp,
        setEnemyHeroHp,
        setGameOver,
        stopTimer,
        setAiRunning,
        addCardToDestroying,
        setDeck,
        setEnemyDeck,
        drawPlayerCard,
        drawEnemyCard,
        drawPlayerCards,
        drawEnemyCards,
        currentMana,
        setCurrentMana,
        enemyCurrentMana,
        setEnemyCurrentMana,
      });
    }, [
      playerFieldCards,
      setPlayerFieldCards,
      playerHandCards,
      setPlayerHandCards,
      enemyFieldCards,
      setEnemyFieldCards,
      playerGraveyard,
      setPlayerGraveyard,
      enemyGraveyard,
      setEnemyGraveyard,
      playerHeroHp,
      setPlayerHeroHp,
      enemyHeroHp,
      setEnemyHeroHp,
      setGameOver,
      stopTimer,
      setAiRunning,
      addCardToDestroying,
      drawPlayerCard,
      drawEnemyCard,
      drawPlayerCards,
      drawEnemyCards,
      setDeck,
      setEnemyDeck,
      currentMana,
      setCurrentMana,
      enemyCurrentMana,
      setEnemyCurrentMana,
    ]);
  const castSpell = useCallback((
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

    applySpell(card, targetId, isPlayer, {
      playerFieldCards,
      enemyFieldCards,
      setPlayerFieldCards,
      setEnemyFieldCards,
      setPlayerHeroHp,
      setEnemyHeroHp,
      setGameOver,
      stopTimer,
      setAiRunning,
      addCardToDestroying,
      playerHandCards,
      enemyHandCards,
      setPlayerHandCards,
      setEnemyHandCards,
      playerGraveyard,
      enemyGraveyard,
      setPlayerGraveyard,
      setEnemyGraveyard,
      setDeck,
      setEnemyDeck,
      currentMana,
      setCurrentMana,
      enemyCurrentMana,
      setEnemyCurrentMana,
      drawPlayerCard,
      drawEnemyCard,
      drawPlayerCards,
      drawEnemyCards,
    });
  }, [
      playerFieldCards,
      setPlayerFieldCards,
      playerHandCards,
      setPlayerHandCards,
      enemyFieldCards,
      setEnemyFieldCards,
      playerGraveyard,
      setPlayerGraveyard,
      enemyGraveyard,
      setEnemyGraveyard,
      playerHeroHp,
      setPlayerHeroHp,
      enemyHeroHp,
      setEnemyHeroHp,
      setGameOver,
      stopTimer,
      setAiRunning,
      addCardToDestroying,
      drawPlayerCard,
      drawEnemyCard,
      drawPlayerCards,
      drawEnemyCards,
      currentMana,
      enemyCurrentMana,
      enemyHandCards,          // read when locating card
      setEnemyHandCards,       // for future closures
  ]);

  // public API
  return {
    drawPlayerCard,
    drawEnemyCard,
    drawPlayerCards,
    drawEnemyCards,
    playCardToField,
    castSpell,
  };
}
