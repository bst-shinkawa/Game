// 攻撃処理に関するサービス
import type { Card } from "../data/cards";
import type { RuntimeCard, GameOverState } from "../types/gameTypes";
import { cards } from "../data/cards";
import { MAX_HAND } from "../constants/gameConstants";
import { normalizeReturnedHandCardFromRuntime } from "./cardService";

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
  setGameOver: React.Dispatch<React.SetStateAction<GameOverState>>;
  stopTimer: () => void;
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>;
  isPlayerAttacker: boolean;
  onAttackBlocked?: (reason: "rush_hero_blocked" | "guard_hero_blocked" | "guard_only_blocked") => void;
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
    onAttackBlocked,
  } = context;

  const attacker = attackerList.find((c) => c.uniqueId === attackerId);
  if (!attacker || !attacker.canAttack) {
    console.log('[Attack] Attack aborted - attacker not found or cannot attack');
    return;
  }

  // rush チェック
  if (attacker.rushInitialTurn && targetId === "hero") {
    console.log("突撃はこのターン、相手フォロワーのみ攻撃可能です");
    onAttackBlocked?.("rush_hero_blocked");
    return;
  }

  // wallGuard チェック（防御側＝攻撃対象側のフィールドに wallGuard があれば直接ヒーローを攻撃できない）
  const hasWallGuard = targetList.some((c) => (c as { wallGuard?: boolean }).wallGuard);
  if (hasWallGuard && targetId === "hero") {
    console.log("相手は鉄壁を持っているため、ヒーローは攻撃できません");
    onAttackBlocked?.("guard_hero_blocked");
    return;
  }
  if (hasWallGuard && targetId !== "hero") {
    const target = targetList.find((c) => c.uniqueId === targetId);
    if (target && !(target as { wallGuard?: boolean }).wallGuard) {
      console.log("相手は鉄壁を持っているため、鉄壁持ちフォロワー以外は攻撃できません");
      onAttackBlocked?.("guard_only_blocked");
      return;
    }
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
  setGameOver: React.Dispatch<React.SetStateAction<GameOverState>>,
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
  const extra = attacker.onAttackEffect === "bonus_vs_hero" ? (attacker.attack ?? 0) : 0;
  const damageToTarget = (attacker.attack ?? 0) + extra;

  const newTargetList = targetList.map((c) =>
    c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - damageToTarget } : c
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
      // return_to_hand_once カードは墓地に加えず手札に戻す
      setTargetGraveyard((g) => {
        const added = deadTargets.filter(d => {
          if (d.deathTrigger && d.deathTrigger.type === "return_to_hand_once") return false;
          return !g.some(x => x.uniqueId === d.uniqueId);
        });
        return [...g, ...added];
      });
      deadTargets.forEach((deadCard: any) => {
        if (!deadCard.deathTrigger) return;
        const trigger = deadCard.deathTrigger;
        if (trigger.type === "add_card_hand" && trigger.cardId) {
          const addCard = cards.find((c) => c.id === trigger.cardId);
          if (addCard) {
            const newCard = { ...addCard, uniqueId: crypto.randomUUID() };
            // 死亡したターゲット側のカードなので、ターゲット側の手札に加える
            setTargetHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
          }
        } else if (trigger.type === "return_to_hand_once") {
          // 死亡時のHPやIDは引き継がず、手札カードとして正規化して戻す
          const returned = normalizeReturnedHandCardFromRuntime(deadCard as RuntimeCard);
          setTargetHandCards((h) => (h.length < MAX_HAND ? [...h, returned] : h));
        }
      });
      addCardToDestroying(deadTargetIds, (ids) => {
        setTargetList((list) => list.filter((c) => !ids.includes(c.uniqueId)));
      });
  }

  const deadAttackers = newAttackerList.filter((c) => (c.hp ?? 0) <= 0);
  const deadAttackerIds = deadAttackers.map(d => d.uniqueId);
  if (deadAttackers.length) {
    // return_to_hand_once カードは墓地に加えず手札に戻す
    setAttackerGraveyard((g) => [...g, ...deadAttackers.filter(d => {
      if ((d as any).deathTrigger && (d as any).deathTrigger.type === "return_to_hand_once") return false;
      return !g.some(x => x.uniqueId === d.uniqueId);
    })]);
    // 攻撃側カードの deathTrigger 処理
    deadAttackers.forEach((deadCard: any) => {
      if (!deadCard.deathTrigger) return;
      const trigger = deadCard.deathTrigger;
      if (trigger.type === "return_to_hand_once") {
        const returned = normalizeReturnedHandCardFromRuntime(deadCard as RuntimeCard);
        setAttackerHandCards((h) => (h.length < MAX_HAND ? [...h, returned] : h));
      } else if (trigger.type === "add_card_hand" && trigger.cardId) {
        const addCard = cards.find((c) => c.id === trigger.cardId);
        if (addCard) {
          const newCard = { ...addCard, uniqueId: crypto.randomUUID() };
          setAttackerHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
        }
      }
    });
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
