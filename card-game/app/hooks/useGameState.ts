"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "@/app/data/cards";
import { drawInitialHand } from "@/app/data/game";
import { createDeck } from "@/app/data/deck";

const MAX_HAND = 10;
const MAX_MANA = 10;
const MAX_HERO_HP = 20;

export function useGameState() {
  // プレイヤー状態
  const [deck, setDeck] = useState<Card[]>([...drawInitialHand(createDeck(), 0)]);
  const [playerHandCards, setPlayerHandCards] = useState<Card[]>([]);
  const [playerFieldCards, setPlayerFieldCards] = useState<(Card & { maxHp: number; canAttack?: boolean })[]>([]);
  const [playerGraveyard, setPlayerGraveyard] = useState<Card[]>([]);
  const [playerHeroHp, setPlayerHeroHp] = useState<number>(MAX_HERO_HP);

  // 敵状態
  const [enemyDeck, setEnemyDeck] = useState<Card[]>([...drawInitialHand(createDeck(), 0)]);
  const [enemyHandCards, setEnemyHandCards] = useState<Card[]>([]);
  const [enemyFieldCards, setEnemyFieldCards] = useState<(Card & { maxHp: number; canAttack?: boolean })[]>([]);
  const [enemyGraveyard, setEnemyGraveyard] = useState<Card[]>([]);
  const [enemyHeroHp, setEnemyHeroHp] = useState<number>(MAX_HERO_HP);

  // マナ
  const [maxMana, setMaxMana] = useState(1);
  const [currentMana, setCurrentMana] = useState(1);
  const [enemyMaxMana, setEnemyMaxMana] = useState(1);
  const [enemyCurrentMana, setEnemyCurrentMana] = useState(1);

  // ドラッグ
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // ゲーム終了
  const [gameOver, setGameOver] = useState<{ over: boolean; winner: null | "player" | "enemy" }>({ over: false, winner: null });

  // プリゲーム
  const [preGame, setPreGame] = useState<boolean>(false);
  const [coinResult, setCoinResult] = useState<"deciding" | "player" | "enemy">("deciding");

  const heal = (targetId: string | "hero", amount: number, isPlayer: boolean = true) => {
    if (targetId === "hero") {
      if (isPlayer) setPlayerHeroHp((hp) => Math.min(hp + amount, MAX_HERO_HP));
      else setEnemyHeroHp((hp) => Math.min(hp + amount, MAX_HERO_HP));
    } else {
      const list = isPlayer ? playerFieldCards : enemyFieldCards;
      const setter = isPlayer ? setPlayerFieldCards : setEnemyFieldCards;
      setter(
        list.map((c) => (c.uniqueId === targetId ? { ...c, hp: Math.min((c.hp ?? 0) + amount, c.maxHp) } : c))
      );
    }
  };

  const addCardToHand = (
    card: Card,
    handList: Card[],
    setHandList: React.Dispatch<React.SetStateAction<Card[]>>,
    graveyardList: Card[],
    setGraveyardList: React.Dispatch<React.SetStateAction<Card[]>>
  ) => {
    if (handList.length >= MAX_HAND) {
      setGraveyardList([...graveyardList, card]);
    } else {
      setHandList([...handList, card]);
    }
  };

  const drawPlayerCard = () => {
    if (deck.length === 0) return;
    const card = { ...deck[0], uniqueId: uuidv4() };
    setDeck((prev) => prev.slice(1));
    addCardToHand(card, playerHandCards, setPlayerHandCards, playerGraveyard, setPlayerGraveyard);
  };

  const drawEnemyCard = () => {
    if (enemyDeck.length === 0) return;
    const card = { ...enemyDeck[0], uniqueId: uuidv4() };
    setEnemyDeck((prev) => prev.slice(1));
    addCardToHand(card, enemyHandCards, setEnemyHandCards, enemyGraveyard, setEnemyGraveyard);
  };

  const doMulligan = (keepIds: string[]) => {
    const kept = playerHandCards.filter(c => keepIds.includes(c.uniqueId));
    const toReturn = playerHandCards.filter(c => !keepIds.includes(c.uniqueId));
    let newDeck = [...deck, ...toReturn.map(c => ({ ...c, uniqueId: uuidv4() }))];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    const drawCount = 5 - kept.length;
    const newHand = [...kept];
    for (let i = 0; i < drawCount && newDeck.length > 0; i++) {
      const card = { ...newDeck[0], uniqueId: uuidv4() };
      newHand.push(card);
      newDeck = newDeck.slice(1);
    }
    setDeck(newDeck);
    setPlayerHandCards(newHand);
  };

  return {
    deck, setDeck,
    playerHandCards, setPlayerHandCards,
    playerFieldCards, setPlayerFieldCards,
    playerGraveyard, setPlayerGraveyard,
    playerHeroHp, setPlayerHeroHp,
    enemyDeck, setEnemyDeck,
    enemyHandCards, setEnemyHandCards,
    enemyFieldCards, setEnemyFieldCards,
    enemyGraveyard, setEnemyGraveyard,
    enemyHeroHp, setEnemyHeroHp,
    maxMana, setMaxMana,
    currentMana, setCurrentMana,
    enemyMaxMana, setEnemyMaxMana,
    enemyCurrentMana, setEnemyCurrentMana,
    draggingCard, setDraggingCard,
    dragPosition, setDragPosition,
    gameOver, setGameOver,
    preGame, setPreGame,
    coinResult, setCoinResult,
    heal,
    drawPlayerCard,
    drawEnemyCard,
    doMulligan,
    addCardToHand,
  };
}
