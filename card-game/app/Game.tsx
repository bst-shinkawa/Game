// Game.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "./data/cards";
import { deck as initialDeck, drawInitialHand } from "./data/game";

const MAX_HAND = 10;
const MAX_MANA = 10;
const MAX_HERO_HP = 20;

export function useGame() {
  // --- プレイヤー状態 ---
  const [deck, setDeck] = useState<Card[]>([...initialDeck]);
  const [playerHandCards, setPlayerHandCards] = useState<Card[]>([]);
  const [playerFieldCards, setPlayerFieldCards] = useState<(Card & { maxHp: number; canAttack?: boolean })[]>([]);
  const [playerGraveyard, setPlayerGraveyard] = useState<Card[]>([]);
  const [playerHeroHp, setPlayerHeroHp] = useState<number>(MAX_HERO_HP);

  // --- 敵状態 ---
  const [enemyDeck, setEnemyDeck] = useState<Card[]>([...initialDeck]);
  const [enemyHandCards, setEnemyHandCards] = useState<Card[]>([]);
  const [enemyFieldCards, setEnemyFieldCards] = useState<(Card & { maxHp: number; canAttack?: boolean })[]>([]);
  const [enemyGraveyard, setEnemyGraveyard] = useState<Card[]>([]);
  const [enemyHeroHp, setEnemyHeroHp] = useState<number>(MAX_HERO_HP);

  // --- DnD ---
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerBattleRef = useRef<HTMLDivElement>(null);

  // --- マナ・ターン ---
  const [turn, setTurn] = useState(1);
  const [maxMana, setMaxMana] = useState(1);
  const [currentMana, setCurrentMana] = useState(1);
  const [enemyMaxMana, setEnemyMaxMana] = useState(1);
  const [enemyCurrentMana, setEnemyCurrentMana] = useState(1);

  // --- 初期手札 ---
  useEffect(() => {
    const initialPlayerHand = drawInitialHand(deck, 5).map((c) => ({ ...c, uniqueId: uuidv4() }));
    const initialEnemyHand = drawInitialHand(enemyDeck, 5).map((c) => ({ ...c, uniqueId: uuidv4() }));
    setPlayerHandCards(initialPlayerHand);
    setEnemyHandCards(initialEnemyHand);
    setDeck((prev) => prev.slice(5));
    setEnemyDeck((prev) => prev.slice(5));
  }, []);

  // --- ターン開始 ---
  useEffect(() => {
    if (turn > 1) {
      drawPlayerCard();
      drawEnemyCard();
    }
    setPlayerFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
  }, [turn]);

  // --- ドロー ---
  const addCardToHand = (
    card: Card,
    handList: Card[],
    setHandList: React.Dispatch<React.SetStateAction<Card[]>>,
    graveyardList: Card[],
    setGraveyardList: React.Dispatch<React.SetStateAction<Card[]>>
  ) => {
    if (handList.length >= MAX_HAND) {
      setGraveyardList([...graveyardList, card]);
      console.log(`${card.name} は手札があふれたため破棄されました`);
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

  // --- ターン終了 ---
  const endTurn = () => {
    setTurn((t) => t + 1);
    setMaxMana((prev) => {
      const newMax = Math.min(prev + 1, MAX_MANA);
      setCurrentMana(newMax);
      return newMax;
    });
    setEnemyMaxMana((prev) => {
      const newMax = Math.min(prev + 1, MAX_MANA);
      setEnemyCurrentMana(newMax);
      return newMax;
    });
  };

  // --- 手札 → フィールド ---
  const playCardToField = (card: Card) => {
    // スペルはフィールドに出せない（ターゲットへドラッグして使用する仕様）
    if (card.type === "spell") {
      console.log("スペルはフィールドに出せません。ターゲットにドロップして使用してください。");
      return;
    }

    if (card.cost > currentMana) {
      console.log("マナが足りません！");
      return;
    }
    setCurrentMana((m) => m - card.cost);

    const canAttack = !!card.rush;
    setPlayerFieldCards((f) => [
      ...f,
      {
        ...card,
        maxHp: card.hp ?? 0,
        canAttack,
      },
    ]);

    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));
  };

  // --- HP回復 ---
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

  // --- 攻撃処理 ---
  const attack = (
    attackerId: string,
    targetId: string | "hero",
    isPlayerAttacker: boolean = true
  ) => {
    const attackerList = isPlayerAttacker ? playerFieldCards : enemyFieldCards;
    const targetList = isPlayerAttacker ? enemyFieldCards : playerFieldCards;
    const setAttackerList = isPlayerAttacker ? setPlayerFieldCards : setEnemyFieldCards;
    const setTargetList = isPlayerAttacker ? setEnemyFieldCards : setPlayerFieldCards;
    const setTargetHeroHp = isPlayerAttacker ? setEnemyHeroHp : setPlayerHeroHp;
    const setGraveyard = isPlayerAttacker ? setEnemyGraveyard : setPlayerGraveyard;

    const attacker = attackerList.find((c) => c.uniqueId === attackerId);
    if (!attacker || !attacker.canAttack) return;

    if (targetId === "hero") {
      setTargetHeroHp((hp) => Math.max(hp - (attacker.attack ?? 0), 0));
    } else {
      const target = targetList.find((c) => c.uniqueId === targetId);
      if (!target) return;

      // 双方にダメージ
      const newTargetList = targetList.map((c) =>
        c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - (attacker.attack ?? 0) } : c
      );
      setTargetList(newTargetList);

      const newAttackerList = attackerList.map((c) =>
        c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - (target.attack ?? 0), canAttack: false } : c
      );
      setAttackerList(newAttackerList);

      // HP0以下のカードを墓地へ
      const deadTargets = newTargetList.filter((c) => (c.hp ?? 0) <= 0);
      if (deadTargets.length) setGraveyard((g) => [...g, ...deadTargets]);
      setTargetList((list) => list.filter((c) => (c.hp ?? 0) > 0));

      const deadAttackers = newAttackerList.filter((c) => (c.hp ?? 0) <= 0);
      if (deadAttackers.length) {
        const setAttackerGrave = isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard;
        setAttackerGrave((g) => [...g, ...deadAttackers]);
        setAttackerList((list) => list.filter((c) => (c.hp ?? 0) > 0));
      }
    }

    // 攻撃済みにする
    setAttackerList((list) =>
      list.map((c) => (c.uniqueId === attackerId ? { ...c, canAttack: false } : c))
    );
  };

  // --- スペルの発動（シンプル実装） ---
  const castSpell = (cardUniqueId: string, targetId: string | "hero", isPlayer: boolean = true) => {
    // プレイヤーか敵かの手札からカードを探す
    const card = playerHandCards.find((c) => c.uniqueId === cardUniqueId) || enemyHandCards.find((c) => c.uniqueId === cardUniqueId);
    if (!card || card.type !== "spell") return;

    // マナチェック（プレイヤーが使う想定）
    if (card.cost > currentMana) {
      console.log("マナが足りません（spell）");
      return;
    }
    setCurrentMana((m) => m - card.cost);

    const name = card.name || "";
    const isHeal = name.includes("回復") || name.toLowerCase().includes("heal");

    if (isHeal) {
      // 回復：味方（プレイヤー側）対象に適用
      if (targetId === "hero") heal("hero", 2, true);
      else heal(targetId, 2, true);
    } else if (name.includes("全体") || name.includes("火球") || name.includes("fireball")) {
      // 敵全体と敵ヒーローにダメージ
      setEnemyFieldCards((list) => {
        const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - 2 }));
        const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
        if (dead.length) setEnemyGraveyard((g) => [...g, ...dead]);
        return updated.filter((c) => (c.hp ?? 0) > 0);
      });
      setEnemyHeroHp((h) => Math.max(h - 2, 0));
    } else {
      // 単体ダメージは敵側対象へ
      if (targetId === "hero") {
        setEnemyHeroHp((h) => Math.max(h - 3, 0));
      } else {
        setEnemyFieldCards((list) => {
          const updated = list.map((c) => (c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - 3 } : c));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) setEnemyGraveyard((g) => [...g, ...dead]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
      }
    }

    // 手札から除去して墓地へ（カードがプレイヤー手札にあればそちらを変更）
    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
    setPlayerGraveyard((g) => [...g, { ...card, uniqueId: uuidv4() }]);
  };

  return {
    deck,
    playerHandCards,
    playerFieldCards,
    playerGraveyard,
    playerHeroHp,
    enemyDeck,
    enemyHandCards,
    enemyFieldCards,
    enemyGraveyard,
    enemyHeroHp,
    draggingCard,
    setDraggingCard,
    dragPosition,
    setDragPosition,
    playerBattleRef,
    turn,
    maxMana,
    currentMana,
    enemyMaxMana,
    enemyCurrentMana,
    playCardToField,
    endTurn,
    attack,
    heal,
    castSpell,
  };
}

export default useGame;