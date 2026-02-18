// 攻撃処理に関するサービス
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
import { cards } from "../data/cards";
import { MAX_HAND } from "../constants/gameConstants";

interface AttackContext {
  attackerList: RuntimeCard[];
  targetList: RuntimeCard[];
  setAttackerList: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setTargetList: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setTargetHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setAttackerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setTargetGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setAttackerHandCards: React.Dispatch<React.SetStateAction<Card[]>>;
  setTargetHandCards: React.Dispatch<React.SetStateAction<Card[]>>;
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>;
  stopTimer: () => void;
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>;
  isPlayerAttacker: boolean;
}

export type AddCardToDestroying = (cardIds: string[], onAfterAnimation?: (ids: string[]) => void) => void;

/**
 * 攻撃処理のメインロジック
 */
export function executeAttack(
  attackerId: string,
  targetId: string | "hero",
  context: AttackContext,
  addCardToDestroying: AddCardToDestroying
): void {
  const {
    attackerList,
    targetList,
    setAttackerList,
    setTargetList,
    setTargetHeroHp,
    setAttackerGraveyard,
    setTargetGraveyard,
    setAttackerHandCards,
    setTargetHandCards,
    setGameOver,
    stopTimer,
    setAiRunning,
    isPlayerAttacker,
  } = context;

  const attacker = attackerList.find((c) => c.uniqueId === attackerId);
  if (!attacker || !attacker.canAttack) {
    console.log('[Attack] Attack aborted - attacker not found or cannot attack');
    return;
  }

  // rush チェック
  if (attacker.rushInitialTurn && targetId === "hero") {
    console.log("突撃はこのターン、相手フォロワーのみ攻撃可能です");
    return;
  }

  // wallGuard チェック
  const defendList = isPlayerAttacker ? targetList : attackerList;
  const hasWallGuard = defendList.some((c) => (c as { wallGuard?: boolean }).wallGuard);
  if (hasWallGuard && targetId === "hero") {
    console.log("相手は鉄壁を持っているため、ヒーローは攻撃できません");
    return;
  }

  if (targetId === "hero") {
    attackHero(attacker, setTargetHeroHp, setAttackerList, attackerId, setAttackerGraveyard, setGameOver, stopTimer, setAiRunning, isPlayerAttacker);
  } else {
    attackFollower(
      attacker,
      attackerId,
      targetId,
      attackerList,
      targetList,
      setAttackerList,
      setTargetList,
      setAttackerGraveyard,
      setTargetGraveyard,
      setAttackerHandCards,
      setTargetHandCards,
      isPlayerAttacker,
      addCardToDestroying
    );
  }
}

/**
 * ヒーローへの攻撃
 */
function attackHero(
  attacker: RuntimeCard,
  setTargetHeroHp: React.Dispatch<React.SetStateAction<number>>,
  setAttackerList: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  attackerId: string,
  setAttackerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>,
  stopTimer: () => void,
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>,
  isPlayerAttacker: boolean
): void {
  const base = attacker.attack ?? 0;
  const extra = attacker.onAttackEffect === "bonus_vs_hero" ? (attacker.attack ?? 0) : 0;
  const total = base + extra;

  setTargetHeroHp((hp) => {
    const next = Math.max(hp - total, 0);
    if (next <= 0) {
      setGameOver({ over: true, winner: isPlayerAttacker ? "player" : "enemy" });
      try { stopTimer(); } catch (e) { /* ignore */ }
      setAiRunning(false);
    }
    return next;
  });

  setAttackerList((list) =>
    list.map((c) =>
      c.uniqueId === attackerId
        ? { ...c, canAttack: false, stealth: false, rushInitialTurn: undefined }
        : c
    )
  );

  // 攻撃時効果: 自分にダメージを受ける等
  if (attacker.onAttackEffect === "self_damage_1") {
    setAttackerList((list) => {
      const updated = list.map((c) =>
        c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - 1 } : c
      );
      const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
      if (dead.length) {
        setAttackerGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
        return updated.filter((c) => (c.hp ?? 0) > 0);
      }
      return updated;
    });
  }
}

/**
 * フォロワーへの攻撃
 */
function attackFollower(
  attacker: RuntimeCard,
  attackerId: string,
  targetId: string,
  attackerList: RuntimeCard[],
  targetList: RuntimeCard[],
  setAttackerList: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setTargetList: React.Dispatch<React.SetStateAction<RuntimeCard[]>>,
  setAttackerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setTargetGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setAttackerHandCards: React.Dispatch<React.SetStateAction<Card[]>>,
  setTargetHandCards: React.Dispatch<React.SetStateAction<Card[]>>,
  isPlayerAttacker: boolean,
  addCardToDestroying: AddCardToDestroying
): void {
  const target = targetList.find((c) => c.uniqueId === targetId);
  if (!target) {
    console.log('[Attack] Target not found');
    return;
  }

  // ターゲットが隠密状態であれば攻撃不能
  if ((target as { stealth?: boolean }).stealth) {
    console.log("そのフォロワーは隠密状態でターゲットにできません");
    return;
  }

  // 双方にダメージ
  const newTargetList = targetList.map((c) =>
    c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - (attacker.attack ?? 0) } : c
  );

  const newAttackerList = attackerList.map((c) =>
    c.uniqueId === attackerId
      ? { ...c, hp: (c.hp ?? 0) - (target.attack ?? 0), canAttack: false, rushInitialTurn: undefined }
      : c
  );

  setTargetList(newTargetList);
  setAttackerList(newAttackerList);

  const deadTargets = newTargetList.filter((c) => (c.hp ?? 0) <= 0);
  const deadTargetIds = deadTargets.map(d => d.uniqueId);
  if (deadTargets.length) {
    setTargetGraveyard((g) => {
      const added = deadTargets.filter(d => !g.some(x => x.uniqueId === d.uniqueId));
      return [...g, ...added];
    });
    deadTargets.forEach((deadCard: any) => {
      if (deadCard.deathTrigger) {
        const trigger = deadCard.deathTrigger;
        if (trigger.type === "add_card_hand" && trigger.cardId) {
          const addCard = cards.find((c) => c.id === trigger.cardId);
          if (addCard) {
            const newCard = { ...addCard, uniqueId: crypto.randomUUID() };
            if (isPlayerAttacker) {
              setTargetHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
            } else {
              setAttackerHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
            }
          }
        }
      }
    });
    addCardToDestroying(deadTargetIds, (ids) => {
      setTargetList((list) => list.filter((c) => !ids.includes(c.uniqueId)));
    });
  }

  const deadAttackers = newAttackerList.filter((c) => (c.hp ?? 0) <= 0);
  const deadAttackerIds = deadAttackers.map(d => d.uniqueId);
  if (deadAttackers.length) {
    setAttackerGraveyard((g) => [...g, ...deadAttackers.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
    addCardToDestroying(deadAttackerIds, (ids) => {
      setAttackerList((list) => list.filter((c) => !ids.includes(c.uniqueId)));
    });
  }

  // 攻撃時効果（例: 剣士の自己ダメージ）
  if (attacker.onAttackEffect === "self_damage_1") {
    setAttackerList((list) => {
      const updated = list.map((c) =>
        c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - 1 } : c
      );
      const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
      if (dead.length) {
        setAttackerGraveyard((g) => [...g, ...dead.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
        return updated.filter((c) => (c.hp ?? 0) > 0);
      }
      return updated;
    });
  }
}
