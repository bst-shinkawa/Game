// スペル処理に関するサービス
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
import { MAX_HERO_HP, MAX_HAND } from "../constants/gameConstants";

interface SpellContext {
  playerFieldCards: RuntimeCard[];
  enemyFieldCards: RuntimeCard[];
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setPlayerHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>;
  stopTimer: () => void;
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>;
  addCardToDestroying: (cardIds: string[]) => void;
}

/**
 * スペルを発動する
 */
export function castSpell(
  card: Card,
  targetId: string | "hero",
  isPlayer: boolean,
  context: SpellContext
): void {
  const {
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
  } = context;

  const effect = card.effect || "";

  switch (effect) {
    case "heal_single":
      handleHealSpell(card, targetId, isPlayer, setEnemyFieldCards, setEnemyHeroHp);
      break;
    case "damage_all":
      handleDamageAllSpell(card, isPlayer, enemyFieldCards, setEnemyFieldCards, setEnemyHeroHp, setEnemyGraveyard, setGameOver, stopTimer, setAiRunning, addCardToDestroying);
      break;
    case "damage_single":
      handleDamageSingleSpell(card, targetId, isPlayer, setEnemyFieldCards, setEnemyHeroHp, setEnemyGraveyard, setGameOver, stopTimer, setAiRunning, addCardToDestroying);
      break;
    case "poison":
      handlePoisonSpell(card, targetId, isPlayer, setEnemyFieldCards, setEnemyHeroHp);
      break;
    case "freeze_single":
      handleFreezeSpell(card, targetId, isPlayer, setEnemyFieldCards);
      break;
    case "haste":
      handleHasteSpell(targetId, isPlayer, playerFieldCards, enemyFieldCards, setPlayerFieldCards, setEnemyFieldCards);
      break;
    default:
      console.debug("未対応の spell effect:", effect);
      break;
  }
}

function handleHealSpell(
  card: Card,
  targetId: string | "hero",
  isPlayer: boolean,
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>
): void {
  const healAmount = card.effectValue ?? 2;
  if (targetId === "hero") {
    setEnemyHeroHp((hp) => Math.min(hp + healAmount, MAX_HERO_HP));
  } else {
    setEnemyFieldCards((list) =>
      list.map((c) =>
        c.uniqueId === targetId
          ? { ...c, hp: Math.min((c.hp ?? 0) + healAmount, c.maxHp) }
          : c
      )
    );
  }
}

function handleDamageAllSpell(
  card: Card,
  isPlayer: boolean,
  enemyFieldCards: RuntimeCard[],
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>,
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>,
  stopTimer: () => void,
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>,
  addCardToDestroying: (cardIds: string[]) => void
): void {
  const dmg = card.effectValue ?? 2;

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
    const hasWallGuard = enemyFieldCards.some((c) => (c as { wallGuard?: boolean }).wallGuard);
    if (hasWallGuard) {
      console.log("敵は鉄壁を持っているため、全体ダメージからヒーローは保護されます");
      return h;
    }
    const next = Math.max(h - dmg, 0);
    if (next <= 0) {
      setGameOver({ over: true, winner: isPlayer ? "player" : "enemy" });
      try { stopTimer(); } catch (e) { /* ignore */ }
      setAiRunning(false);
    }
    return next;
  });
}

function handleDamageSingleSpell(
  card: Card,
  targetId: string | "hero",
  isPlayer: boolean,
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>,
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>,
  stopTimer: () => void,
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>,
  addCardToDestroying: (cardIds: string[]) => void
): void {
  const dmg = card.effectValue ?? 3;
  if (targetId === "hero") {
    setEnemyHeroHp((h) => {
      const next = Math.max(h - dmg, 0);
      if (next <= 0) {
        setGameOver({ over: true, winner: isPlayer ? "player" : "enemy" });
        try { stopTimer(); } catch (e) { /* ignore */ }
        setAiRunning(false);
      }
      return next;
    });
  } else {
    setEnemyFieldCards((list) => {
      const updated = list.map((c) => (c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - dmg } : c));
      const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
      if (dead.length) {
        addCardToDestroying(dead.map(d => d.uniqueId));
        setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
      }
      return updated.filter((c) => (c.hp ?? 0) > 0);
    });
  }
}

function handlePoisonSpell(
  card: Card,
  targetId: string | "hero",
  isPlayer: boolean,
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>
): void {
  if (targetId === "hero") {
    const pdmg = card.effectValue ?? 1;
    setEnemyHeroHp((h) => Math.max(h - pdmg, 0));
  } else {
    const poisonDamage = card.effectValue ?? 1;
    const poisonDuration = card.statusDuration ?? 3;
    setEnemyFieldCards((list) =>
      list.map((c) =>
        c.uniqueId === targetId
          ? { ...c, poison: poisonDuration, poisonDamage }
          : c
      )
    );
  }
}

function handleFreezeSpell(
  card: Card,
  targetId: string | "hero",
  isPlayer: boolean,
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>
): void {
  if (targetId !== "hero") {
    const freezeDuration = card.statusDuration ?? 1;
    setEnemyFieldCards((list) =>
      list.map((c) =>
        c.uniqueId === targetId
          ? { ...c, frozen: freezeDuration, canAttack: false }
          : c
      )
    );
  } else {
    console.log("ヒーローは凍結できません");
  }
}

function handleHasteSpell(
  targetId: string | "hero",
  isPlayer: boolean,
  playerFieldCards: RuntimeCard[],
  enemyFieldCards: RuntimeCard[],
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>
): void {
  if (targetId !== "hero") {
    const targetList = isPlayer ? playerFieldCards : enemyFieldCards;
    const setTargetList = isPlayer ? setPlayerFieldCards : setEnemyFieldCards;
    const target = targetList.find((c) => c.uniqueId === targetId);

    if (target && target.canAttack && !(target as { rush?: boolean }).rush) {
      setTargetList((list) =>
        list.map((c) =>
          c.uniqueId === targetId
            ? { ...c, canAttack: true, rush: true, haste: true }
            : c
        )
      );
    } else {
      console.log("加速呪文：攻撃済みまたは既に突進を持っているため付与できません");
    }
  }
}
