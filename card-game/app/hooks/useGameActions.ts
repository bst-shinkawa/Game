"use client";

import { v4 as uuidv4 } from "uuid";
import type { Card } from "@/app/data/cards";
import { cards } from "@/app/data/cards";

const MAX_MANA = 10;
const MAX_HAND = 10;

export function useGameActions(
  playerFieldCards: (Card & { maxHp: number; canAttack?: boolean })[],
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<(Card & { maxHp: number; canAttack?: boolean })[]>>,
  playerHandCards: Card[],
  setPlayerHandCards: React.Dispatch<React.SetStateAction<Card[]>>,
  enemyFieldCards: (Card & { maxHp: number; canAttack?: boolean })[],
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<(Card & { maxHp: number; canAttack?: boolean })[]>>,
  enemyHandCards: Card[],
  setEnemyHandCards: React.Dispatch<React.SetStateAction<Card[]>>,
  currentMana: number,
  setCurrentMana: React.Dispatch<React.SetStateAction<number>>,
  enemyCurrentMana: number,
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>,
  playerGraveyard: Card[],
  setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  enemyGraveyard: Card[],
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  playerHeroHp: number,
  setPlayerHeroHp: React.Dispatch<React.SetStateAction<number>>,
  enemyHeroHp: number,
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>,
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>,
  stopTimer: () => void,
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>
) {
  // フォロワーをフィールドに出す
  const playCardToField = (card: Card) => {
    if (card.type === "spell") {
      console.log("スペルはフィールドに出せません。");
      return;
    }

    if (playerFieldCards.length >= 5) {
      console.log("フィールドは最大5体までです。");
      return;
    }

    if (card.cost > currentMana) {
      console.log("マナが足りません！");
      return;
    }
    setCurrentMana((m) => m - card.cost);

    const canAttack = !!(card.rush || card.superHaste);
    setPlayerFieldCards((f) => [
      ...f,
      {
        ...card,
        maxHp: card.hp ?? 0,
        canAttack,
        rushInitialTurn: card.rush ? true : undefined,
      },
    ]);

    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));

    // 召喚時効果
    if (card.summonEffect) {
      const se = card.summonEffect;
      if (se.type === "damage_all" && (se.value ?? 0) > 0) {
        const dmg = se.value ?? 1;
        setEnemyFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
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

    // 召喚時トリガー
    if (card.summonTrigger) {
      const trigger = card.summonTrigger;
      if (trigger.type === "add_card_hand" && trigger.cardId) {
        const addCard = cards.find((c) => c.id === trigger.cardId);
        if (addCard) {
          const newCard = { ...addCard, uniqueId: crypto.randomUUID() };
          setPlayerHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
        }
      }
    }
  };

  // 攻撃処理
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

    // rush チェック
    if ((attacker as { rushInitialTurn?: boolean }).rushInitialTurn && targetId === "hero") {
      console.log("突撃はこのターン、相手フォロワーのみ攻撃可能です");
      return;
    }

    // wallGuard チェック
    const defendList = isPlayerAttacker ? enemyFieldCards : playerFieldCards;
    const hasWallGuard = defendList.some((c) => (c as { wallGuard?: boolean }).wallGuard);
    if (hasWallGuard && targetId === "hero") {
      console.log("相手は鉄壁を持っているため、ヒーローは攻撃できません");
      return;
    }

    if (targetId === "hero") {
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

      setAttackerList((list) => list.map((c) => (c.uniqueId === attackerId ? { ...c, canAttack: false, stealth: false, rushInitialTurn: undefined } : c)));

      if (attacker.onAttackEffect === "self_damage_1") {
        setAttackerList((list) => {
          const updated = list.map((c) => (c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - 1 } : c));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) {
            const setAttackerGrave = isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard;
            setAttackerGrave((g) => [...g, ...dead.filter((d) => !g.some(x => x.uniqueId === d.uniqueId))]);
            return updated.filter((c) => (c.hp ?? 0) > 0);
          }
          return updated;
        });
      }
    } else {
      const target = targetList.find((c) => c.uniqueId === targetId);
      if (!target) return;

      if ((target as { stealth?: boolean }).stealth) {
        console.log("そのフォロワーは隠密状態でターゲットにできません");
        return;
      }

      const newTargetList = targetList.map((c) =>
        c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - (attacker.attack ?? 0) } : c
      );
      setTargetList(newTargetList);

      const newAttackerList = attackerList.map((c) =>
        c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - (target.attack ?? 0), canAttack: false, rushInitialTurn: undefined } : c
      );
      setAttackerList(newAttackerList);

      const deadTargets = newTargetList.filter((c) => (c.hp ?? 0) <= 0);
      if (deadTargets.length) {
        const setTargetGrave = isPlayerAttacker ? setEnemyGraveyard : setPlayerGraveyard;
        setTargetGrave((g) => [...g, ...deadTargets.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
        
        deadTargets.forEach((deadCard: any) => {
          if (deadCard.deathTrigger) {
            const trigger = deadCard.deathTrigger;
            if (trigger.type === "add_card_hand" && trigger.cardId) {
              const addCard = cards.find((c) => c.id === trigger.cardId);
              if (addCard) {
                const newCard = { ...addCard, uniqueId: crypto.randomUUID() };
                if (isPlayerAttacker) {
                  setEnemyHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
                } else {
                  setPlayerHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
                }
              }
            }
          }
        });
      }
      setTargetList((list) => list.filter((c) => (c.hp ?? 0) > 0));

      const deadAttackers = newAttackerList.filter((c) => (c.hp ?? 0) <= 0);
      if (deadAttackers.length) {
        const setAttackerGrave = isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard;
        setAttackerGrave((g) => [...g, ...deadAttackers.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
        setAttackerList((list) => list.filter((c) => (c.hp ?? 0) > 0));
      }

      if (attacker.onAttackEffect === "self_damage_1") {
        setAttackerList((list) => {
          const updated = list.map((c) => (c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - 1 } : c));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) {
            const setAttackerGrave = isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard;
            setAttackerGrave((g) => [...g, ...dead.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
            return updated.filter((c) => (c.hp ?? 0) > 0);
          }
          return updated;
        });
      }
    }
  };

  // スペル発動
  const castSpell = (cardUniqueId: string, targetId: string | "hero", isPlayer: boolean = true) => {
    const card = playerHandCards.find((c) => c.uniqueId === cardUniqueId) || enemyHandCards.find((c) => c.uniqueId === cardUniqueId);
    if (!card || card.type !== "spell") return;

    if (card.cost > currentMana) {
      console.log("マナが足りません（spell）");
      return;
    }
    setCurrentMana((m) => m - card.cost);

    const effect = card.effect || "";
    const heal = (targetId: string | "hero", amount: number, isPlayer: boolean = true) => {
      if (targetId === "hero") {
        if (isPlayer) setPlayerHeroHp((hp) => Math.min(hp + amount, 20));
        else setEnemyHeroHp((hp) => Math.min(hp + amount, 20));
      }
    };

    switch (effect) {
      case "heal_single":
        if (targetId === "hero") heal("hero", 2, true);
        else heal(targetId, 2, true);
        break;
      case "damage_all":
        setEnemyFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - 2 }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
        setEnemyHeroHp((h) => {
          const next = Math.max(h - 2, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "player" });
            try { stopTimer(); } catch (e) { /* ignore */ }
            setAiRunning(false);
          }
          return next;
        });
        break;
      case "damage_single":
        const isLightning = (card.name || "").toLowerCase().includes("雷") || (card.name || "").toLowerCase().includes("lightning");
        const dmg = isLightning ? 4 : 3;
        if (targetId === "hero") {
          setEnemyHeroHp((h) => {
            const next = Math.max(h - dmg, 0);
            if (next <= 0) {
              setGameOver({ over: true, winner: "player" });
              try { stopTimer(); } catch (e) { /* ignore */ }
              setAiRunning(false);
            }
            return next;
          });
        } else {
          setEnemyFieldCards((list) => {
            const updated = list.map((c) => (c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - dmg } : c));
            const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
            if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
            return updated.filter((c) => (c.hp ?? 0) > 0);
          });
        }
        break;
      case "poison":
        if (targetId === "hero") {
          const pdmg = card.effectValue ?? 1;
          setEnemyHeroHp((h) => Math.max(h - pdmg, 0));
        } else {
          setEnemyFieldCards((list) =>
            list.map((c) => (c.uniqueId === targetId ? { ...c, poison: card.statusDuration ?? 3, poisonDamage: card.effectValue ?? 1 } : c))
          );
        }
        break;
      case "freeze_single":
        if (targetId !== "hero") {
          setEnemyFieldCards((list) =>
            list.map((c) => (c.uniqueId === targetId ? { ...c, frozen: card.statusDuration ?? 1, canAttack: false } : c))
          );
        }
        break;
      case "haste":
        if (targetId !== "hero") {
          const target = playerFieldCards.find((c) => c.uniqueId === targetId);
          if (target && target.canAttack && !target.rush) {
            setPlayerFieldCards((list) =>
              list.map((c) =>
                c.uniqueId === targetId
                  ? { ...c, canAttack: true, rush: true, haste: true }
                  : c
              )
            );
          }
        }
        break;
      default:
        break;
    }

    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
    setPlayerGraveyard((g) => [...g, { ...card, uniqueId: uuidv4() }]);
  };

  return {
    playCardToField,
    attack,
    castSpell,
  };
}
