import { v4 as uuidv4 } from "uuid";
import type { Card } from "./cards";
import { cards } from "./cards";
import type { AIGameContext, RuntimeCard } from "../types/gameTypes";
import { applySpell, executePlayEffects } from "../services/effectService";
import type { PlayContext } from "../services/effectService";
import { MAX_MANA, MAX_HAND } from "../constants/gameConstants";
import { getEffectiveCost, checkSynergy, getSynergyAttackBonus } from "../services/synergyUtils";

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

const getSpellResultText = (spell: Card, targetId: string | "hero"): string => {
  const value = spell.effectValue ?? 1;
  switch (spell.effect) {
    case "damage_single":
      if (spell.id === 15) return targetId === "hero" ? "ヒーローに1ダメージ" : "フォロワーに2ダメージ";
      return `${value}ダメージ`;
    case "damage_all":
      return `全体に${value}ダメージ`;
    case "heal_single":
      return `${value}回復`;
    case "draw_cards":
      return `${value}枚ドロー`;
    case "freeze_single":
      return `${value}ターン凍結`;
    case "poison":
      return `${value}ターン毒付与`;
    case "haste":
      return "疾走付与";
    case "reduce_cost":
      return `手札コスト-${value}`;
    case "return_to_deck":
      return "山札に戻す";
    case "steal_follower":
      return "フォロワー奪取";
    case "summon_token":
      return `${value}体召喚`;
    default:
      return "効果発動";
  }
};

function buildPlayContextFromAI(ctx: AIGameContext, localDaggerCount: number = 0, fieldSize: number = 0): PlayContext {
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
    playerHeroMaxHp: ctx.playerHeroMaxHp,
    enemyHeroMaxHp: ctx.enemyHeroMaxHp,
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
    daggerCount: localDaggerCount,
    fieldSize,
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
    enemyHeroMaxHp,
    playerFieldCards,
    playerHeroHp,
    playerHeroMaxHp,
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
    addActionLog,
    showCardReveal,
    clearCardReveal,
  } = ctx;

  // mutable local copies to track what the AI still has available
  let localHand = [...enemyHandCards];
  let localEnemyDeck = [...enemyDeck];
  // このターン中に使用した暗器の枚数（シナジー判定用）
  let localDaggerCount = 0;
  const syncEnemyMana = (mana: number) => setEnemyCurrentMana(Math.max(0, mana));
  const getCurrentPlayerFieldCards = () =>
    (ctx.getPlayerFieldCards ? ctx.getPlayerFieldCards() : playerFieldCards).filter((c) => (c.hp ?? 0) > 0);

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
        const had23LethalDagger = lethalSpell.id === 15 && localHand.some((c) => c.id === 23);
        const had28LethalDagger = lethalSpell.id === 15 && localHand.some((c) => c.id === 28);
        localHand = localHand.filter((c) => c.uniqueId !== spellId);
        setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== spellId));
        setEnemyGraveyard((g) => [...g, { ...lethalSpell!, uniqueId: uuidv4() }]);
        remainingMana -= lethalSpell.cost;
        syncEnemyMana(remainingMana);
        const lethalResultText = getSpellResultText(lethalSpell, "hero");
        addActionLog(`${lethalSpell.name} を発動（対象: ヒーロー / 結果: ${lethalResultText}）`, "✨");
        ctx.onEnemySpellCast?.({
          spellName: lethalSpell.name,
          targetLabel: "ヒーロー",
          resultText: lethalResultText,
          round: 0,
        });

        showCardReveal(lethalSpell, "hero", "spell");
        await sleep(1350);
        clearCardReveal();
        if (cancelRef.current) return;

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
        if (lethalSpell.id === 15) {
          ctx.onEnemyPlayedDagger?.({ had23: had23LethalDagger, had28: had28LethalDagger });
        }
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

    const enemyDaggerStacks = ctx.enemyCostByDaggerStacksRef.current;

    let followerCandidates = localHand
      .filter((c) => c.type === "follower")
      .map((c) => {
        const effCost = getEffectiveCost(c, fieldCount, localDaggerCount, enemyDaggerStacks);
        return {
          card: c,
          effectiveCost: effCost,
          score: (c.attack ?? 0) + (c.hp ?? 0) / 2,
          efficiency: ((c.attack ?? 0) + (c.hp ?? 0) / 2) / Math.max(1, effCost),
        };
      });

    if (Math.random() < 0.5) {
      followerCandidates.sort((a, b) =>
        b.efficiency !== a.efficiency ? b.efficiency - a.efficiency : b.score - a.score
      );
    } else {
      followerCandidates.sort(() => Math.random() - 0.5);
    }

    const localSummoned: (RuntimeCard & { uniqueId: string; isAnimating?: boolean })[] = [];

    while (remainingMana > 0 && fieldCount < 5 && followerCandidates.length > 0) {
      // 有効コストを再計算（暗器使用後にコストが変わる場合に対応）
      followerCandidates = followerCandidates.map((e) => ({
        ...e,
        effectiveCost: getEffectiveCost(
          e.card,
          fieldCount,
          localDaggerCount,
          ctx.enemyCostByDaggerStacksRef.current
        ),
      }));

      let entry;
      if (isDefensiveTurn) {
        const wallCandidates = followerCandidates.filter(
          (e) => (e.card.hp ?? 0) >= 5 || (e.card as any).wallGuard
        );
        entry =
          wallCandidates.find((e) => e.effectiveCost <= remainingMana) ||
          followerCandidates.find((e) => e.effectiveCost <= remainingMana);
      } else {
        if (Math.random() < 0.7) {
          entry = followerCandidates.find((e) => e.effectiveCost <= remainingMana);
        } else {
          const affordable = followerCandidates.filter((e) => e.effectiveCost <= remainingMana);
          entry = affordable.length > 0 ? affordable[Math.floor(Math.random() * affordable.length)] : undefined;
        }
      }
      if (!entry) break;

      const card = entry.card;
      remainingMana -= entry.effectiveCost;
      syncEnemyMana(remainingMana);
      const preFieldForSynergy = fieldCount;
      fieldCount += 1;
      const animId = uuidv4();
      const canAttackInitial = !!(card.rush || card.charge);
      const rushInitialTurn = card.rush ? true : undefined;
      const created = {
        ...card,
        maxHp: card.hp ?? 0,
        canAttack: canAttackInitial,
        uniqueId: animId,
        isAnimating: true,
        rushInitialTurn,
      } as RuntimeCard;
      const atkBonusSummon = getSynergyAttackBonus(card, preFieldForSynergy, localDaggerCount);
      if (atkBonusSummon > 0) {
        (created as RuntimeCard).baseAttack = created.attack ?? 0;
        created.attack = (created.attack ?? 0) + atkBonusSummon;
      }

      addActionLog(`${card.name} を召喚`, "⚔️");
      showCardReveal(card, undefined, "follower");
      await sleep(1000);
      clearCardReveal();
      if (cancelRef.current) return;

      localSummoned.push(created);
      localHand = localHand.filter((c) => c.uniqueId !== card.uniqueId);
      setEnemyFieldCards((f) => [...f, created]);
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));
      followerCandidates = followerCandidates.filter((e) => e.card.uniqueId !== card.uniqueId);

      // 召喚効果
      if (card.summonEffect?.type === "damage_all") {
        const base = card.summonEffect.value ?? 1;
        const bonusDmg =
          card.synergy?.effect.type === "summon_damage_bonus" &&
          checkSynergy(card, preFieldForSynergy, localDaggerCount)
            ? card.synergy.effect.value ?? 0
            : 0;
        const dmg = base + bonusDmg;
        setPlayerFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length)
            setPlayerGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
        if (bonusDmg > 0) {
          setPlayerHeroHp((hp) => {
            const next = Math.max(hp - dmg, 0);
            if (next <= 0) {
              setGameOver({ over: true, winner: "enemy" });
              try {
                stopTimer();
              } catch (_) {}
              return 0;
            }
            return next;
          });
        }
      } else if (card.summonEffect?.type === "damage_single") {
        const dmg = card.summonEffect.value ?? 1;
        setPlayerFieldCards((list) => {
          if (list.length === 0) {
            setPlayerHeroHp((hp) => {
              const next = Math.max(hp - dmg, 0);
              if (next <= 0) { setGameOver({ over: true, winner: "enemy" }); try { stopTimer(); } catch (_) {} return 0; }
              return next;
            });
            return list;
          }
          const idx = Math.floor(Math.random() * list.length);
          const updated = list.map((c, i) => (i === idx ? { ...c, hp: (c.hp ?? 0) - dmg } : c));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length)
            setPlayerGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
      }

      if (card.summonTrigger?.type === "add_card_hand" && card.summonTrigger.cardId) {
        const addCard = cards.find((c) => c.id === card.summonTrigger!.cardId);
        if (addCard) {
          const newCard = { ...addCard, uniqueId: uuidv4() };
          setEnemyHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
        }
      }

      // データ駆動のプレイ時効果を実行（影の罠師：凍結先をランダム指定）
      let playEffectExtraIds: string[] | undefined;
      if (
        card.onPlayEffects?.some((e) => e.type === "freeze_random_enemy") &&
        card.summonSelectableTargets?.includes("field_card")
      ) {
        const freezePick = getCurrentPlayerFieldCards();
        if (freezePick.length > 0) {
          playEffectExtraIds = [freezePick[Math.floor(Math.random() * freezePick.length)].uniqueId];
        }
      }
      executePlayEffects(
        card,
        false,
        buildPlayContextFromAI(ctx, localDaggerCount, fieldCount),
        playEffectExtraIds
      );

      (async () => {
        await sleep(600);
        if (cancelRef.current) return;
        setEnemyFieldCards((list) => list.map((c) => (c.uniqueId === animId ? { ...c, isAnimating: false } : c)));
      })();
      await sleep(600);
      if (cancelRef.current) return;
    }

    // --- スペルフェイズ ---
    // 相手手札が少ない場合は手札攻撃スペルを優先する（手札0勝利を狙う）
    const playerHandIsLow = playerHandCards.length <= 4;
    let spellCandidates = localHand.filter(
      (c) =>
        c.type === "spell" &&
        getEffectiveCost(c, fieldCount, localDaggerCount, ctx.enemyCostByDaggerStacksRef.current) <= remainingMana
    );
    const spellPriority = [
      "poison", "freeze_single", "damage_single", "damage_all",
      "heal_single", "haste", "draw_cards", "reduce_cost",
      "return_to_deck", "steal_follower", "summon_token", "discard_hand",
    ] as const;

    // 暗器（id:15）は他のシナジースペルの前に必ず先に使う
    const sortSpellsForPlay = (candidates: Card[]): Card[] => {
      return [...candidates].sort((a, b) => {
        if (a.id === 15 && b.id !== 15) return -1;
        if (a.id !== 15 && b.id === 15) return 1;
        // 手札が少ない場合は手札攻撃を優先
        if (playerHandIsLow) {
          if ((a.effect === "return_to_deck" || a.effect === "discard_hand") &&
              b.effect !== "return_to_deck" && b.effect !== "discard_hand") return -1;
          if ((b.effect === "return_to_deck" || b.effect === "discard_hand") &&
              a.effect !== "return_to_deck" && a.effect !== "discard_hand") return 1;
        }
        return 0;
      });
    };

    while (remainingMana > 0 && spellCandidates.length > 0) {
      // 暗器優先 + 手札攻撃優先でソート
      const sortedCandidates = sortSpellsForPlay(spellCandidates);
      // まず暗器または手札攻撃スペルを先にチェックし、なければ通常優先度
      let spell: Card | undefined = sortedCandidates.find(
        (c) =>
          getEffectiveCost(c, fieldCount, localDaggerCount, ctx.enemyCostByDaggerStacksRef.current) <= remainingMana
      );
      if (!spell) {
        const priorityOrder = Math.random() < 0.5;
        const order = priorityOrder ? [...spellPriority] : [...spellPriority].sort(() => Math.random() - 0.5);
        for (const type of order) {
          spell = spellCandidates.find(
            (c) =>
              c.effect === type &&
              getEffectiveCost(c, fieldCount, localDaggerCount, ctx.enemyCostByDaggerStacksRef.current) <= remainingMana
          );
          if (spell) break;
        }
      }
      if (!spell) break;

      const spellId = spell.uniqueId;
      const had23BeforeDagger = spell.id === 15 && localHand.some((c) => c.id === 23);
      const had28BeforeDagger = spell.id === 15 && localHand.some((c) => c.id === 28);
      const spellEffCost = getEffectiveCost(
        spell,
        fieldCount,
        localDaggerCount,
        ctx.enemyCostByDaggerStacksRef.current
      );
      localHand = localHand.filter((c) => c.uniqueId !== spellId);
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== spellId));
      setEnemyGraveyard((g) => [...g, { ...spell!, uniqueId: uuidv4() }]);
      remainingMana -= spellEffCost;
      syncEnemyMana(remainingMana);

      let targetId: string | "hero" = "hero";
      switch (spell.effect) {
        case "reduce_cost": {
          const others = localHand.filter((c) => c.cost > 0 && c.uniqueId !== spellId);
          if (others.length > 0) {
            targetId = [...others].sort((a, b) => b.cost - a.cost)[0].uniqueId;
          }
          break;
        }
        case "heal_single": {
          const damaged = enemyFieldCards.find((c) => (c.hp ?? 0) < (c.maxHp ?? 0));
          if (damaged) targetId = damaged.uniqueId;
          break;
        }
        case "damage_single":
        case "freeze_single":
        case "haste": {
          const currentPlayerFieldCards = getCurrentPlayerFieldCards();
          if (currentPlayerFieldCards.length > 0) {
            if (spell.effect === "freeze_single" && Math.random() < 0.7) {
              targetId = currentPlayerFieldCards.reduce((best, c) => ((c.attack ?? 0) > (best.attack ?? 0) ? c : best)).uniqueId;
            } else {
              targetId = currentPlayerFieldCards[Math.floor(Math.random() * currentPlayerFieldCards.length)].uniqueId;
            }
          }
          break;
        }
        case "poison": {
          const currentPlayerFieldCards = getCurrentPlayerFieldCards();
          if (currentPlayerFieldCards.length > 0) {
            targetId = Math.random() < 0.7
              ? currentPlayerFieldCards.reduce((best, c) => ((c.hp ?? 0) > (best.hp ?? 0) ? c : best)).uniqueId
              : currentPlayerFieldCards[Math.floor(Math.random() * currentPlayerFieldCards.length)].uniqueId;
          } else {
            targetId = "hero";
          }
          break;
        }
        case "steal_follower": {
          const currentPlayerFieldCards = getCurrentPlayerFieldCards();
          if (currentPlayerFieldCards.length > 0) {
            // 価値の高いフォロワーを優先（攻撃力+HPが高い順）
            const best = [...currentPlayerFieldCards].sort(
              (a, b) => ((b.attack ?? 0) + (b.hp ?? 0)) - ((a.attack ?? 0) + (a.hp ?? 0))
            )[0];
            targetId = best?.uniqueId ?? currentPlayerFieldCards[0].uniqueId;
          } else {
            // 対象不在時は不発なので使用対象から外すため break 後に skip 判定で弾く
            targetId = "hero";
          }
          break;
        }
        default:
          targetId = "hero";
      }

      if (
        (spell.effect === "steal_follower" && targetId === "hero") ||
        (spell.effect === "poison" && targetId === "hero")
      ) {
        // 対象がいないのでこのスペルはスキップ
        spellCandidates = spellCandidates.filter((c) => c.uniqueId !== spellId);
        continue;
      }

      const targetLabel = targetId === "hero"
        ? "ヒーロー"
        : (getCurrentPlayerFieldCards().find((c) => c.uniqueId === targetId)?.name ?? "フォロワー");
      const resultText = getSpellResultText(spell, targetId);
      addActionLog(`${spell.name} を発動（対象: ${targetLabel} / 結果: ${resultText}）`, "✨");
      ctx.onEnemySpellCast?.({
        spellName: spell.name,
        targetLabel,
        resultText,
        round: 0,
      });

      showCardReveal(spell, targetId, "spell");
      await sleep(1350);
      clearCardReveal();
      if (cancelRef.current) return;

      // 暗器（id:15）使用時にカウントアップ（ターン用＋打出し直前手札にいた 23/28 に応じてスタック）
      if (spell.id === 15) {
        localDaggerCount += 1;
        ctx.onEnemyPlayedDagger?.({ had23: had23BeforeDagger, had28: had28BeforeDagger });
      }

      setEnemySpellAnimation({ targetId, effect: spell.effect! });
      const currentPlayerFieldCards = getCurrentPlayerFieldCards();
      applySpell(spell, targetId, false, {
        playerFieldCards: currentPlayerFieldCards,
        enemyFieldCards,
        setPlayerFieldCards,
        setEnemyFieldCards,
        setPlayerHeroHp,
        setEnemyHeroHp,
        playerHeroMaxHp,
        enemyHeroMaxHp,
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
        daggerCount: localDaggerCount,
        fieldSize: fieldCount,
      });

      await sleep(600);
      if (cancelRef.current) return;
      spellCandidates = localHand.filter(
        (c) =>
          c.type === "spell" &&
          getEffectiveCost(c, fieldCount, localDaggerCount, ctx.enemyCostByDaggerStacksRef.current) <= remainingMana
      );
    }

    // --- 2) 攻撃フェイズ ---
    const executeAttacks = async () => {
      let latestField: RuntimeCard[] = [];
      setEnemyFieldCards((prev) => {
        latestField = prev.map((c) => {
          const wasOnFieldAtStart = fieldAtTurnStartIds.includes(c.uniqueId);
          const isFrozen = !!(c.frozen && c.frozen > 0);
          const allowAttack = !isFrozen && (wasOnFieldAtStart || !!c.rushInitialTurn || !!c.charge || !!c.rush);
          return { ...c, canAttack: allowAttack };
        });
        return latestField;
      });

      await sleep(60);

      // latestField には召喚済みフォロワーも含まれるため、重複連結しない
      const attackList = latestField.filter(Boolean);

      for (const enemyCard of attackList) {
        if (cancelRef.current) return;
        if (!enemyCard.canAttack) continue;

        let target: string | "hero" | null = null;
        const validTargets = getCurrentPlayerFieldCards();
        const guardTargets = validTargets.filter((c) => (c as { wallGuard?: boolean }).wallGuard);
        const hasWallGuardOnPlayer = guardTargets.length > 0;
        const attackerCannotHitHeroDueToRush = !!enemyCard.rushInitialTurn;
        const allowHeroTarget = !attackerCannotHitHeroDueToRush && !hasWallGuardOnPlayer;
        const selectableFollowerTargets = hasWallGuardOnPlayer ? guardTargets : validTargets;

        if (selectableFollowerTargets.length > 0) {
          if (Math.random() < 0.6) {
            const mostThreatened = selectableFollowerTargets.reduce((best, c) => {
              const bestScore = (best.attack ?? 0) * 2 + (best.hp ?? 0) + (best.effect ? 1.5 : 0);
              const cScore = (c.attack ?? 0) * 2 + (c.hp ?? 0) + (c.effect ? 1.5 : 0);
              return cScore > bestScore ? c : best;
            });
            target = mostThreatened.uniqueId;
          } else {
            target = selectableFollowerTargets[Math.floor(Math.random() * selectableFollowerTargets.length)].uniqueId;
          }
        }

        if (!target) {
          if (allowHeroTarget) target = "hero";
          else continue;
        } else if (target === "hero" && !allowHeroTarget) {
          if (selectableFollowerTargets.length > 0) {
            target = selectableFollowerTargets[Math.floor(Math.random() * selectableFollowerTargets.length)].uniqueId;
          } else {
            continue;
          }
        }

        setEnemyFieldCards((prev) =>
          prev.map((c) => {
            if (c.uniqueId !== enemyCard.uniqueId) return c;
            const isFrozen = !!(c.frozen && c.frozen > 0);
            return { ...c, canAttack: !isFrozen };
          })
        );
        await sleep(40);

        setMovingAttack({ attackerId: enemyCard.uniqueId, targetId: target as string | "hero" });
        setEnemyAttackAnimation({ sourceCardId: enemyCard.uniqueId, targetId: target as string | "hero" });
        await sleep(50);

        {
          const targetLabel =
            target === "hero"
              ? "ヒーロー"
              : getCurrentPlayerFieldCards().find((c) => c.uniqueId === target)?.name ?? "フォロワー";
          addActionLog(`${enemyCard.name} → ${targetLabel} に攻撃`, "💥");
        }
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
