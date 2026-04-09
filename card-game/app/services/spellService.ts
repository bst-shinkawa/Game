// スペル処理に関するサービス
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../data/cards";
import type { RuntimeCard, GameOverState } from "../types/gameTypes";
import { MAX_HAND } from "../constants/gameConstants";
import { getSynergyDamageBonus } from "./synergyUtils";
import { normalizeReturnedHandCardFromRuntime } from "./cardService";

export interface SpellContext {
  playerFieldCards: RuntimeCard[];
  enemyFieldCards: RuntimeCard[];
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setPlayerHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>;
  playerHeroMaxHp: number;
  enemyHeroMaxHp: number;
  setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setPlayerHandCards?: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyHandCards?: React.Dispatch<React.SetStateAction<Card[]>>;
  setGameOver: React.Dispatch<React.SetStateAction<GameOverState>>;
  stopTimer: () => void;
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>;
  addCardToDestroying: (cardIds: string[], onAfterAnimation?: (ids: string[]) => void) => void;
  daggerCount?: number;
  fieldSize?: number;
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
  console.debug(`[Spell] ${isPlayer ? "Player" : "Enemy"} casts ${card.name} (${card.effect}) on ${targetId}`);
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
    daggerCount = 0,
    fieldSize = 0,
  } = context;

  // the following variables represent the caster's side (own) and the opponent's side (opp)
  const ownFieldCards = isPlayer ? playerFieldCards : enemyFieldCards;
  const oppFieldCards = isPlayer ? enemyFieldCards : playerFieldCards;
  const setOwnFieldCards = isPlayer ? setPlayerFieldCards : setEnemyFieldCards;
  const setOppFieldCards = isPlayer ? setEnemyFieldCards : setPlayerFieldCards;
  const setOwnHeroHp = isPlayer ? setPlayerHeroHp : setEnemyHeroHp;
  const ownHeroMaxHp = isPlayer ? context.playerHeroMaxHp : context.enemyHeroMaxHp;
  const setOppHeroHp = isPlayer ? setEnemyHeroHp : setPlayerHeroHp;
  const setOwnGraveyard = isPlayer ? setPlayerGraveyard : setEnemyGraveyard;
  const setOppGraveyard = isPlayer ? setEnemyGraveyard : setPlayerGraveyard;
  const setOwnHandCards = isPlayer ? context.setPlayerHandCards : context.setEnemyHandCards;
  const setOppHandCards = isPlayer ? context.setEnemyHandCards : context.setPlayerHandCards;

  const effect = card.effect || "";

  switch (effect) {
    case "heal_single":
      handleHealSpell(card, targetId, isPlayer, setOwnFieldCards, setOwnHeroHp, ownHeroMaxHp);
      break;
    case "damage_all":
      handleDamageAllSpell(
        card,
        isPlayer,
        oppFieldCards,
        setOppFieldCards,
        setOppHeroHp,
        setOppGraveyard,
        setOppHandCards,
        setGameOver,
        stopTimer,
        setAiRunning,
        addCardToDestroying,
        fieldSize,
        daggerCount
      );
      break;
    case "damage_single":
      handleDamageSingleSpell(
        card,
        targetId,
        isPlayer,
        oppFieldCards,
        setOppFieldCards,
        setOppHeroHp,
        setOppGraveyard,
        setOppHandCards,
        setGameOver,
        stopTimer,
        setAiRunning,
        addCardToDestroying,
        fieldSize,
        daggerCount
      );
      break;
    case "poison":
      handlePoisonSpell(card, targetId, isPlayer, setOppFieldCards, setOppHeroHp);
      break;
    case "freeze_single":
      handleFreezeSpell(card, targetId, isPlayer, setOppFieldCards);
      break;
    case "haste":
      handleHasteSpell(
        targetId,
        isPlayer,
        ownFieldCards,
        oppFieldCards,
        setOwnFieldCards,
        setOppFieldCards
      );
      break;
    case "draw_cards":
      // drawing is handled in useCardOperations; nothing to do here
      break;
    case "reduce_cost":
    case "return_to_deck":
    case "steal_follower":
    case "summon_token":
      // custom effects; the logic lives in the caller (useCardOperations)
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
  setField: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setHeroHp: React.Dispatch<React.SetStateAction<number>>,
  maxHeroHp: number
): void {
  const healAmount = card.effectValue ?? 2;
  if (targetId === "hero") {
    setHeroHp((hp) => Math.min(hp + healAmount, maxHeroHp));
  } else {
    setField((list) =>
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
  targetFieldCards: RuntimeCard[],
  setTargetFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setTargetHeroHp: React.Dispatch<React.SetStateAction<number>>,
  setTargetGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setTargetHandCards: React.Dispatch<React.SetStateAction<Card[]>> | undefined,
  setGameOver: React.Dispatch<React.SetStateAction<GameOverState>>,
  stopTimer: () => void,
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>,
  addCardToDestroying: (cardIds: string[], onAfterAnimation?: (ids: string[]) => void) => void,
  fieldSize: number = 0,
  daggerCount: number = 0
): void {
  const dmg = (card.effectValue ?? 1) + getSynergyDamageBonus(card, fieldSize, daggerCount);

  // HP を減らす（死亡カードは即除去せず、アニメーション完了後に除去する）
  setTargetFieldCards((list) => list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg })));

  const dead = targetFieldCards.filter((c) => (c.hp ?? 0) - dmg <= 0);
  if (dead.length) {
    const deadIds = dead.map((d) => d.uniqueId);
    setTargetGraveyard((g) => [...g, ...dead.filter((d) => {
      if (d.deathTrigger?.type === "return_to_hand_once") return false;
      return !g.some((x) => x.uniqueId === d.uniqueId);
    })]);
    dead.forEach((d) => {
      if (d.deathTrigger?.type === "return_to_hand_once" && setTargetHandCards) {
        setTargetHandCards((h) => (h.length < MAX_HAND ? [...h, normalizeReturnedHandCardFromRuntime(d)] : h));
      }
    });
    addCardToDestroying(deadIds, (ids) => {
      setTargetFieldCards((l) => l.filter((c) => !ids.includes(c.uniqueId)));
    });
  }

  setTargetHeroHp((h) => {
    const hasWallGuard = targetFieldCards.some((c) => (c as { wallGuard?: boolean }).wallGuard);
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
  targetFieldCards: RuntimeCard[],
  setTargetFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setTargetHeroHp: React.Dispatch<React.SetStateAction<number>>,
  setTargetGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setTargetHandCards: React.Dispatch<React.SetStateAction<Card[]>> | undefined,
  setGameOver: React.Dispatch<React.SetStateAction<GameOverState>>,
  stopTimer: () => void,
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>,
  addCardToDestroying: (cardIds: string[], onAfterAnimation?: (ids: string[]) => void) => void,
  fieldSize: number = 0,
  daggerCount: number = 0
): void {
  const baseDmg = (card.effectValue ?? 1) + getSynergyDamageBonus(card, fieldSize, daggerCount);
  // 暗器(id:15)はフォロワー2/ヒーロー1ダメージ
  const dmg = card.id === 15 ? (targetId === "hero" ? 1 : 2) : baseDmg;
  if (targetId === "hero") {
    setTargetHeroHp((h) => {
      const next = Math.max(h - dmg, 0);
      if (next <= 0) {
        setGameOver({ over: true, winner: isPlayer ? "player" : "enemy" });
        try { stopTimer(); } catch (e) { /* ignore */ }
        setAiRunning(false);
      }
      return next;
    });
  } else {
    // HP を減らす（死亡カードは即除去せず、アニメーション完了後に除去する）
    setTargetFieldCards((list) => list.map((c) => (c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - dmg } : c)));

    const target = targetFieldCards.find((c) => c.uniqueId === targetId);
    if (target && (target.hp ?? 0) - dmg <= 0) {
      if (target.deathTrigger?.type === "return_to_hand_once") {
        if (setTargetHandCards) {
          setTargetHandCards((h) => (h.length < MAX_HAND ? [...h, normalizeReturnedHandCardFromRuntime(target)] : h));
        }
      } else {
        setTargetGraveyard((g) => [...g, ...(g.some((x) => x.uniqueId === target.uniqueId) ? [] : [target])]);
      }
      addCardToDestroying([target.uniqueId], (ids) => {
        setTargetFieldCards((l) => l.filter((c) => !ids.includes(c.uniqueId)));
      });
    }
  }
}

function handlePoisonSpell(
  card: Card,
  targetId: string | "hero",
  isPlayer: boolean,
  setTargetFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setTargetHeroHp: React.Dispatch<React.SetStateAction<number>>
): void {
  if (targetId === "hero") {
    const pdmg = card.effectValue ?? 1;
    setTargetHeroHp((h) => Math.max(h - pdmg, 0));
  } else {
    const poisonDamage = card.effectValue ?? 1;
    const poisonDuration = card.statusDuration ?? 3;
    setTargetFieldCards((list) =>
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
  setTargetFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>
): void {
  if (targetId !== "hero") {
    const freezeDuration = card.statusDuration ?? 1;
    setTargetFieldCards((list) =>
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
  ownFieldCards: RuntimeCard[],
  oppFieldCards: RuntimeCard[],
  setOwnFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setOppFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>
): void {
  if (targetId !== "hero") {
    const targetList = isPlayer ? ownFieldCards : oppFieldCards;
    const setTargetList = isPlayer ? setOwnFieldCards : setOppFieldCards;
    const target = targetList.find((c) => c.uniqueId === targetId);

    if (target && target.canAttack && !(target as { rush?: boolean; charge?: boolean }).rush && !(target as { rush?: boolean; charge?: boolean }).charge) {
      setTargetList((list) =>
        list.map((c) =>
          c.uniqueId === targetId
            ? { ...c, canAttack: true, charge: true, haste: true }
            : c
        )
      );
    } else {
      console.log("加速呪文：攻撃済みまたは既に突進を持っているため付与できません");
    }
  }
}
