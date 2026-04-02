import { v4 as uuidv4 } from "uuid";
import type { Card } from "./cards";
import { cards } from "./cards";
import type { AIGameContext, RuntimeCard } from "../types/gameTypes";
import { applySpell, executePlayEffects } from "../services/effectService";
import type { PlayContext } from "../services/effectService";
import { MAX_MANA, MAX_HAND } from "../constants/gameConstants";

export function evaluateBoardState({
  enemyFieldCards,
  enemyHandCards,
  enemyHeroHp,
  enemyCurrentMana,
  playerFieldCards,
  playerHandCards,
  playerHeroHp,
  playerCurrentMana,
}: {
  enemyFieldCards: Card[];
  enemyHandCards: Card[];
  enemyHeroHp: number;
  enemyCurrentMana: number;
  playerFieldCards: Card[];
  playerHandCards: Card[];
  playerHeroHp: number;
  playerCurrentMana: number;
}) {
  const enemyScore =
    enemyHeroHp * 2 +
    enemyCurrentMana +
    enemyFieldCards.reduce((sum, c) => sum + (c.attack ?? 0) + (c.hp ?? 0), 0) +
    enemyHandCards.length * 1.5;
  const playerScore =
    playerHeroHp * 2 +
    playerCurrentMana +
    playerFieldCards.reduce((sum, c) => sum + (c.attack ?? 0) + (c.hp ?? 0), 0) +
    playerHandCards.length * 1.5;
  return enemyScore - playerScore;
}

export function startEnemyTurn(ctx: AIGameContext) {
  const {
    enemyDeck,
    setEnemyDeck,
    setEnemyHandCards,
    setEnemyGraveyard,
    setEnemyFieldCards,
  } = ctx;

  if (enemyDeck.length > 0) {
    const card = { ...enemyDeck[0], uniqueId: uuidv4() };
    setEnemyDeck((prev) => prev.slice(1));
    setEnemyHandCards((prev) => {
      if (prev.length >= MAX_HAND) {
        setEnemyGraveyard((gPrev) => [...gPrev, card]);
        return prev;
      }
      return [...prev, card];
    });
  }

  setEnemyFieldCards((prev) =>
    prev.map((c) => ({ ...c, canAttack: true, rushInitialTurn: undefined }))
  );
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

function buildPlayContextFromAI(ctx: AIGameContext): PlayContext {
  return {
    playerFieldCards: ctx.playerFieldCards as RuntimeCard[],
    enemyFieldCards: ctx.enemyFieldCards,
    setPlayerFieldCards: ctx.setPlayerFieldCards,
    setEnemyFieldCards: ctx.setEnemyFieldCards,
    playerHandCards: ctx.playerHandCards,
    enemyHandCards: ctx.enemyHandCards,
    setPlayerHandCards: ctx.setPlayerHandCards,
    setEnemyHandCards: ctx.setEnemyHandCards,
    playerGraveyard: ctx.playerGraveyard,
    enemyGraveyard: ctx.enemyGraveyard,
    setPlayerGraveyard: ctx.setPlayerGraveyard,
    setEnemyGraveyard: ctx.setEnemyGraveyard,
    setPlayerHeroHp: ctx.setPlayerHeroHp,
    setEnemyHeroHp: ctx.setEnemyHeroHp,
    setGameOver: ctx.setGameOver,
    stopTimer: ctx.stopTimer,
    setAiRunning: ctx.setAiRunning,
    addCardToDestroying: ctx.addCardToDestroying,
    setDeck: ctx.setPlayerDeck,
    setEnemyDeck: ctx.setEnemyDeck,
    currentMana: 0,
    setCurrentMana: () => {},
    enemyCurrentMana: ctx.enemyCurrentMana,
    setEnemyCurrentMana: ctx.setEnemyCurrentMana,
    drawPlayerCard: ctx.drawPlayerCard,
    drawEnemyCard: ctx.drawEnemyCard,
    drawPlayerCards: ctx.drawPlayerCards,
    drawEnemyCards: ctx.drawEnemyCards,
  };
}

export async function runEnemyTurn(ctx: AIGameContext) {
  const {
    enemyDeck,
    enemyHandCards,
    enemyGraveyard,
    enemyFieldCards,
    enemyCurrentMana,
    enemyHeroHp,
    playerFieldCards,
    playerHeroHp,
    playerHandCards,
    playerGraveyard,
    setEnemyDeck,
    setEnemyHandCards,
    setEnemyFieldCards,
    setEnemyCurrentMana,
    setEnemyHeroHp,
    setEnemyGraveyard,
    setPlayerHandCards,
    setPlayerFieldCards,
    setPlayerHeroHp,
    setPlayerGraveyard,
    setPlayerDeck,
    setGameOver,
    setAiRunning,
    setMovingAttack,
    setEnemyAttackAnimation,
    setEnemySpellAnimation,
    attack,
    endTurn,
    stopTimer,
    drawPlayerCard,
    drawEnemyCard,
    drawPlayerCards,
    drawEnemyCards,
    addCardToDestroying,
    cancelRef,
  } = ctx;

  // mutable local copies to track what the AI still has available
  let localHand = [...enemyHandCards];
  let localEnemyDeck = [...enemyDeck];

  try {
    await sleep(800);
    if (cancelRef.current) return;

    const fieldAtTurnStartIds = enemyFieldCards.map((c) => c.uniqueId);

    // --- リーサル判定 ---
    const lethalThreshold = 5;
    if (playerHeroHp <= lethalThreshold) {
      let remainingMana = enemyCurrentMana;
      let lethalSpell = localHand.find(
        (c) =>
          c.type === "spell" &&
          (c.effect === "damage_single" || c.effect === "damage_all") &&
          c.cost <= remainingMana
      );
      while (lethalSpell && remainingMana >= lethalSpell.cost) {
        const spellId = lethalSpell.uniqueId;
        localHand = localHand.filter((c) => c.uniqueId !== spellId);
        setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== spellId));
        setEnemyGraveyard((g) => [...g, { ...lethalSpell!, uniqueId: uuidv4() }]);
        remainingMana -= lethalSpell.cost;
        const dmg = lethalSpell.effectValue ?? 1;
        setPlayerHeroHp((hp) => {
          const next = Math.max(hp - dmg, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "enemy" });
            try { stopTimer(); } catch (_) {}
            return 0;
          }
          return next;
        });
        await sleep(600);
        if (cancelRef.current) return;
        lethalSpell = localHand.find(
          (c) =>
            c.type === "spell" &&
            (c.effect === "damage_single" || c.effect === "damage_all") &&
            c.cost <= remainingMana
        );
      }
    }

    // --- 1) プレイフェイズ ---
    let remainingMana = enemyCurrentMana;
    let fieldCount = enemyFieldCards.length;

    const DEFENSIVE_HP_THRESHOLD = 15;
    const BOARD_DISADVANTAGE_THRESHOLD = -10;
    let isDefensiveTurn = false;
    if (enemyHeroHp <= DEFENSIVE_HP_THRESHOLD) isDefensiveTurn = true;
    const boardScore = evaluateBoardState({
      enemyFieldCards,
      enemyHandCards: localHand,
      enemyHeroHp,
      enemyCurrentMana,
      playerFieldCards,
      playerHandCards: [],
      playerHeroHp,
      playerCurrentMana: 0,
    });
    if (boardScore < BOARD_DISADVANTAGE_THRESHOLD) isDefensiveTurn = true;

    let followerCandidates = localHand
      .filter((c) => c.type === "follower")
      .map((c) => ({
        card: c,
        score: (c.attack ?? 0) + (c.hp ?? 0) / 2,
        efficiency: ((c.attack ?? 0) + (c.hp ?? 0) / 2) / Math.max(1, c.cost),
      }));

    if (Math.random() < 0.5) {
      followerCandidates.sort((a, b) =>
        b.efficiency !== a.efficiency ? b.efficiency - a.efficiency : b.score - a.score
      );
    } else {
      followerCandidates.sort(() => Math.random() - 0.5);
    }

    const localSummoned: (RuntimeCard & { uniqueId: string; isAnimating?: boolean })[] = [];

    while (remainingMana > 0 && fieldCount < 5 && followerCandidates.length > 0) {
      let entry;
      if (isDefensiveTurn) {
        const wallCandidates = followerCandidates.filter(
          (e) => (e.card.hp ?? 0) >= 5 || ["guard", "shield", "heal"].includes(e.card.effect ?? "")
        );
        entry =
          wallCandidates.find((e) => e.card.cost <= remainingMana) ||
          followerCandidates.find((e) => e.card.cost <= remainingMana);
      } else {
        if (Math.random() < 0.7) {
          entry = followerCandidates.find((e) => e.card.cost <= remainingMana);
        } else {
          const affordable = followerCandidates.filter((e) => e.card.cost <= remainingMana);
          entry = affordable.length > 0 ? affordable[Math.floor(Math.random() * affordable.length)] : undefined;
        }
      }
      if (!entry) break;

      const card = entry.card;
      remainingMana -= card.cost;
      fieldCount += 1;
      const animId = uuidv4();
      const canAttackInitial = !!(card.rush || card.superHaste);
      const rushInitialTurn = card.rush ? true : undefined;
      const created = {
        ...card,
        maxHp: card.hp ?? 0,
        canAttack: canAttackInitial,
        uniqueId: animId,
        isAnimating: true,
        rushInitialTurn,
      } as RuntimeCard;

      localSummoned.push(created);
      localHand = localHand.filter((c) => c.uniqueId !== card.uniqueId);
      setEnemyFieldCards((f) => [...f, created]);
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));
      followerCandidates = followerCandidates.filter((e) => e.card.uniqueId !== card.uniqueId);

      // 召喚効果
      if (card.summonEffect?.type === "damage_all") {
        const dmg = card.summonEffect.value ?? 1;
        setPlayerFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length)
            setPlayerGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
        setPlayerHeroHp((hp) => {
          const next = Math.max(hp - dmg, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "enemy" });
            try { stopTimer(); } catch (_) {}
            return 0;
          }
          return next;
        });
      }

      if (card.summonTrigger?.type === "add_card_hand" && card.summonTrigger.cardId) {
        const addCard = cards.find((c) => c.id === card.summonTrigger!.cardId);
        if (addCard) {
          const newCard = { ...addCard, uniqueId: uuidv4() };
          setEnemyHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
        }
      }

      // データ駆動のプレイ時効果を実行（旧 card.id ハードコードを置換）
      executePlayEffects(card, false, buildPlayContextFromAI(ctx));

      (async () => {
        await sleep(600);
        if (cancelRef.current) return;
        setEnemyFieldCards((list) => list.map((c) => (c.uniqueId === animId ? { ...c, isAnimating: false } : c)));
      })();
      await sleep(600);
      if (cancelRef.current) return;
    }

    // --- スペルフェイズ ---
    let spellCandidates = localHand.filter((c) => c.type === "spell" && c.cost <= remainingMana);
    const spellPriority = [
      "poison", "freeze_single", "damage_single", "damage_all",
      "heal_single", "haste", "draw_cards", "reduce_cost",
      "return_to_deck", "steal_follower", "summon_token",
    ] as const;

    while (remainingMana > 0 && spellCandidates.length > 0) {
      const priorityOrder = Math.random() < 0.5;
      const order = priorityOrder ? [...spellPriority] : [...spellPriority].sort(() => Math.random() - 0.5);
      let spell: Card | undefined;
      for (const type of order) {
        spell = spellCandidates.find((c) => c.effect === type && c.cost <= remainingMana);
        if (spell) break;
      }
      if (!spell) break;

      const spellId = spell.uniqueId;
      localHand = localHand.filter((c) => c.uniqueId !== spellId);
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== spellId));
      setEnemyGraveyard((g) => [...g, { ...spell!, uniqueId: uuidv4() }]);
      remainingMana -= spell.cost;

      let targetId: string | "hero" = "hero";
      switch (spell.effect) {
        case "heal_single": {
          const damaged = enemyFieldCards.find((c) => (c.hp ?? 0) < (c.maxHp ?? 0));
          if (damaged) targetId = damaged.uniqueId;
          break;
        }
        case "damage_single":
        case "poison":
        case "freeze_single":
        case "haste": {
          if (playerFieldCards.length > 0) {
            if (spell.effect === "poison" && Math.random() < 0.7) {
              targetId = playerFieldCards.reduce((best, c) => ((c.hp ?? 0) > (best.hp ?? 0) ? c : best)).uniqueId;
            } else if (spell.effect === "freeze_single" && Math.random() < 0.7) {
              targetId = playerFieldCards.reduce((best, c) => ((c.attack ?? 0) > (best.attack ?? 0) ? c : best)).uniqueId;
            } else {
              targetId = playerFieldCards[Math.floor(Math.random() * playerFieldCards.length)].uniqueId;
            }
          }
          break;
        }
        default:
          targetId = "hero";
      }

      setEnemySpellAnimation({ targetId, effect: spell.effect! });
      applySpell(spell, targetId, false, {
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
        playerHandCards,
        enemyHandCards: localHand,
        setPlayerHandCards,
        setEnemyHandCards,
        playerGraveyard,
        enemyGraveyard,
        drawPlayerCard,
        drawEnemyCard,
        drawPlayerCards,
        drawEnemyCards,
        setDeck: setPlayerDeck,
        setEnemyDeck,
        currentMana: 0,
        setCurrentMana: () => {},
        enemyCurrentMana: remainingMana,
        setEnemyCurrentMana,
      });

      await sleep(600);
      if (cancelRef.current) return;
      spellCandidates = localHand.filter((c) => c.type === "spell" && c.cost <= remainingMana);
    }

    // --- 2) 攻撃フェイズ ---
    const executeAttacks = async () => {
      let latestField: RuntimeCard[] = [];
      setEnemyFieldCards((prev) => {
        latestField = prev.map((c) => {
          const wasOnFieldAtStart = fieldAtTurnStartIds.includes(c.uniqueId);
          const allowAttack = wasOnFieldAtStart || !!c.rushInitialTurn || !!c.superHaste || !!c.rush;
          return { ...c, canAttack: allowAttack };
        });
        return latestField;
      });

      await sleep(60);

      const attackList = [...latestField, ...localSummoned].filter(Boolean);

      for (const enemyCard of attackList) {
        if (cancelRef.current) return;
        if (!enemyCard.canAttack) continue;

        const hasWallGuardOnPlayer = playerFieldCards.some((c) => (c as { wallGuard?: boolean }).wallGuard);
        const attackerCannotHitHeroDueToRush = !!enemyCard.rushInitialTurn;
        const allowHeroTarget = !attackerCannotHitHeroDueToRush && !hasWallGuardOnPlayer;

        let target: string | "hero" | null = null;
        const validTargets = playerFieldCards.filter((c) => (c.hp ?? 0) > 0);

        if (validTargets.length > 0) {
          if (Math.random() < 0.6) {
            const mostThreatened = validTargets.reduce((best, c) => {
              const bestScore = (best.attack ?? 0) * 2 + (best.hp ?? 0) + (best.effect ? 1.5 : 0);
              const cScore = (c.attack ?? 0) * 2 + (c.hp ?? 0) + (c.effect ? 1.5 : 0);
              return cScore > bestScore ? c : best;
            });
            target = mostThreatened.uniqueId;
          } else {
            target = validTargets[Math.floor(Math.random() * validTargets.length)].uniqueId;
          }
        }

        if (!target) {
          if (allowHeroTarget) target = "hero";
          else continue;
        } else if (target === "hero" && !allowHeroTarget) {
          if (validTargets.length > 0) {
            target = validTargets[Math.floor(Math.random() * validTargets.length)].uniqueId;
          } else {
            continue;
          }
        }

        setEnemyFieldCards((prev) => prev.map((c) => (c.uniqueId === enemyCard.uniqueId ? { ...c, canAttack: true } : c)));
        await sleep(40);

        setMovingAttack({ attackerId: enemyCard.uniqueId, targetId: target as string | "hero" });
        setEnemyAttackAnimation({ sourceCardId: enemyCard.uniqueId, targetId: target as string | "hero" });
        await sleep(50);

        attack(enemyCard.uniqueId, target as string | "hero", false);
        await sleep(850);
        setMovingAttack(null);
        setEnemyAttackAnimation(null);
      }
    };

    await executeAttacks();

    // --- 3) ターン終了 ---
    await sleep(1000);
    if (cancelRef.current) return;
    await sleep(1000);
    if (cancelRef.current) return;
    endTurn();
  } finally {
    setAiRunning(false);
  }
}
