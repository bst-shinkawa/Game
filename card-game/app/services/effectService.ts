import { v4 as uuidv4 } from "uuid";
import type { Card, EffectType, TriggerType, CardPlayEffect } from "../data/cards";
import type { RuntimeCard, GameOverState } from "../types/gameTypes";
import { checkSynergy } from "./synergyUtils";
import { cards } from "../data/cards";
import { addCardToHand, createFieldCard } from "./cardService";
import { MAX_FIELD_SIZE, MAX_HAND } from "../constants/gameConstants";
import type { SpellContext } from "./spellService";
import { castSpell as spellServiceCastSpell } from "./spellService";

// ---------------------------------------------------------------------------
// contextual types used by both play and spell handling
// ---------------------------------------------------------------------------

export interface PlayContext {
  playerFieldCards: RuntimeCard[];
  enemyFieldCards: RuntimeCard[];
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  playerHandCards: Card[];
  enemyHandCards: Card[];
  setPlayerHandCards: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyHandCards: React.Dispatch<React.SetStateAction<Card[]>>;
  playerGraveyard: Card[];
  enemyGraveyard: Card[];
  setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setPlayerHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setGameOver: React.Dispatch<React.SetStateAction<GameOverState>>;
  stopTimer: () => void;
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>;
  addCardToDestroying: (cardIds: string[], onAfterAnimation?: (ids: string[]) => void) => void;
  setDeck: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyDeck: React.Dispatch<React.SetStateAction<Card[]>>;
  currentMana: number;
  setCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  enemyCurrentMana: number;
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  drawPlayerCard: () => void;
  drawEnemyCard: () => void;
  drawPlayerCards: (count: number) => void;
  drawEnemyCards: (count: number) => void;
  // シナジー評価に使用するコンテキスト情報
  daggerCount?: number;    // このターン中に使用した暗器の枚数
  fieldSize?: number;      // 自分の場のフォロワー数
}

// ---------------------------------------------------------------------------
// データ駆動エフェクト実行エンジン
// カードの onPlayEffects 配列を読み取り、ジェネリックに効果を適用する
// ---------------------------------------------------------------------------

export function executePlayEffects(
  card: Card,
  isPlayer: boolean,
  ctx: PlayContext,
  selectedTargetIds?: string[]
): void {
  const effects = card.onPlayEffects;
  if (!effects || effects.length === 0) return;

  for (const eff of effects) {
    switch (eff.type) {
      case "draw": {
        const count = eff.count ?? 1;
        if (isPlayer) ctx.drawPlayerCards(count);
        else ctx.drawEnemyCards(count);
        break;
      }
      case "add_card": {
        const addCard = cards.find((c) => c.id === eff.cardId);
        if (!addCard) break;
        const count = eff.count ?? 1;
        const setHand = isPlayer ? ctx.setPlayerHandCards : ctx.setEnemyHandCards;
        const setGrave = isPlayer ? ctx.setPlayerGraveyard : ctx.setEnemyGraveyard;
        for (let i = 0; i < count; i++) {
          const newCard = { ...addCard, uniqueId: uuidv4() };
          addCardToHand(newCard, setHand, setGrave);
        }
        break;
      }
      case "summon_token": {
        const tokenBase = cards.find((c) => c.id === eff.cardId);
        if (!tokenBase) break;
        const count = eff.count ?? 1;
        const setOwnField = isPlayer ? ctx.setPlayerFieldCards : ctx.setEnemyFieldCards;
        // token_buff シナジー：招集などが場3体以上のときに召喚トークンをバフ
        const tokenBuff = (card.synergy?.effect.type === "token_buff" &&
          checkSynergy(card, ctx.fieldSize ?? 0, ctx.daggerCount ?? 0))
          ? { attack: card.synergy.effect.attack ?? 0, hp: card.synergy.effect.hp ?? 0 }
          : null;
        for (let i = 0; i < count; i++) {
          const ownLen = (isPlayer ? ctx.playerFieldCards : ctx.enemyFieldCards).length;
          if (ownLen + i >= MAX_FIELD_SIZE) break;
          const token = createFieldCard(tokenBase, eff.canAttack ?? false);
          if (eff.noTrigger) delete (token as any).summonTrigger;
          if (tokenBuff) {
            token.baseAttack = token.attack ?? 0;
            token.baseHp = token.hp ?? 0;
            token.attack = (token.attack ?? 0) + tokenBuff.attack;
            token.hp = (token.hp ?? 0) + tokenBuff.hp;
            token.maxHp = (token.maxHp ?? 0) + tokenBuff.hp;
          }
          setOwnField((f) => [...f, token]);
          const tokenId = token.uniqueId;
          setTimeout(() => {
            setOwnField((f) => f.map((c) => c.uniqueId === tokenId ? { ...c, isAnimating: false } : c));
          }, 600);
        }
        break;
      }
      case "summon_buffed": {
        const baseCard = cards.find((c) => c.id === eff.cardId);
        if (!baseCard) break;
        const count = eff.count ?? 1;
        const setOwnField = isPlayer ? ctx.setPlayerFieldCards : ctx.setEnemyFieldCards;
        for (let i = 0; i < count; i++) {
          const ownLen = (isPlayer ? ctx.playerFieldCards : ctx.enemyFieldCards).length;
          if (ownLen + i >= MAX_FIELD_SIZE) break;
          const token = createFieldCard(baseCard, eff.canAttack ?? false);
          if (eff.buff) {
            // バフ前の基礎スタッツを保存（CardItemで緑色表示に使用）
            (token as any).baseAttack = baseCard.attack ?? 0;
            (token as any).baseHp = baseCard.hp ?? 0;
            token.attack = (token.attack ?? 0) + (eff.buff.attack ?? 0);
            token.hp = (token.hp ?? 0) + (eff.buff.hp ?? 0);
            token.maxHp = (token.maxHp ?? 0) + (eff.buff.hp ?? 0);
          }
          setOwnField((f) => [...f, token]);
          // 召喚アニメーション後に isAnimating をクリアする
          const tokenId = token.uniqueId;
          setTimeout(() => {
            setOwnField((f) => f.map((c) => c.uniqueId === tokenId ? { ...c, isAnimating: false } : c));
          }, 600);
        }
        break;
      }
      case "steal_graveyard": {
        const oppGraveyard = isPlayer ? ctx.enemyGraveyard : ctx.playerGraveyard;
        const maxCost = eff.maxCost ?? Infinity;
        const valid = oppGraveyard.filter((c) => c.cost <= maxCost);
        if (valid.length > 0) {
          const chosen = valid[Math.floor(Math.random() * valid.length)];
          const newCard = { ...chosen, uniqueId: uuidv4() };
          const setHand = isPlayer ? ctx.setPlayerHandCards : ctx.setEnemyHandCards;
          const setGrave = isPlayer ? ctx.setPlayerGraveyard : ctx.setEnemyGraveyard;
          addCardToHand(newCard, setHand, setGrave);
        }
        break;
      }
      case "discard_own": {
        const count = eff.count ?? 1;
        const setOwnHand = isPlayer ? ctx.setPlayerHandCards : ctx.setEnemyHandCards;
        const setOwnGrave = isPlayer ? ctx.setPlayerGraveyard : ctx.setEnemyGraveyard;
        for (let i = 0; i < count; i++) {
          const targetId = selectedTargetIds?.[i];
          setOwnHand((hand) => {
            if (hand.length === 0) return hand;
            let idx: number;
            if (targetId) {
              idx = hand.findIndex((c) => c.uniqueId === targetId);
              if (idx === -1) idx = Math.floor(Math.random() * hand.length);
            } else {
              idx = Math.floor(Math.random() * hand.length);
            }
            const discarded = hand[idx];
            setOwnGrave((g) => [...g, discarded]);
            return hand.filter((_, j) => j !== idx);
          });
        }
        break;
      }
      case "freeze_random_enemy": {
        const setOppField = isPlayer ? ctx.setEnemyFieldCards : ctx.setPlayerFieldCards;
        const oppField = isPlayer ? ctx.enemyFieldCards : ctx.playerFieldCards;
        // extra_freeze シナジー：暗器2回以上使用時にもう1体凍結
        const freezeCount = (eff.count ?? 1) +
          (card.synergy?.effect.type === "extra_freeze" && checkSynergy(card, ctx.fieldSize ?? 0, ctx.daggerCount ?? 0) ? 1 : 0);
        if (oppField.length > 0) {
          setOppField((list) => {
            if (list.length === 0) return list;
            const notFrozen = list.map((_, i) => i).filter((i) => !(list[i] as any).frozen);
            const toFreeze = [...notFrozen].sort(() => Math.random() - 0.5).slice(0, freezeCount);
            return list.map((c, i) => (toFreeze.includes(i) ? { ...c, frozen: 1, canAttack: false } : c));
          });
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export function applySpell(
  card: Card,
  targetId: string | "hero",
  isPlayer: boolean,
  context: SpellContext & PlayContext
) {
  const {
    playerFieldCards,
    enemyFieldCards,
    setPlayerFieldCards,
    setEnemyFieldCards,
    playerHandCards,
    enemyHandCards,
    setPlayerHandCards,
    setEnemyHandCards,
    playerGraveyard,
    enemyGraveyard,
    setPlayerGraveyard,
    setEnemyGraveyard,
    setPlayerHeroHp,
    setEnemyHeroHp,
    setGameOver,
    stopTimer,
    setAiRunning,
    addCardToDestroying,
    setDeck,
    setEnemyDeck,
    currentMana,
    setCurrentMana,
    enemyCurrentMana,
    setEnemyCurrentMana,
  } = context;

  spellServiceCastSpell(card, targetId, isPlayer, context);

  // base effect ごとの追加処理
  switch (card.effect) {
    case "draw_cards": {
      const count = card.effectValue ?? 1;
      if (isPlayer) context.drawPlayerCards(count);
      else context.drawEnemyCards(count);
      break;
    }
    case "reduce_cost": {
      const delta = card.effectValue ?? 1;
      const hand = isPlayer ? playerHandCards : enemyHandCards;
      const setter = isPlayer ? setPlayerHandCards : setEnemyHandCards;
      let idx = hand.findIndex((c: Card) => c.uniqueId === targetId && c.cost > 0);
      if (idx === -1) {
        idx = hand.findIndex((c: Card) => c.cost > 0 && c.uniqueId !== card.uniqueId);
      }
      if (idx !== -1) {
        const targetUniqueId = hand[idx].uniqueId;
        const newCost = Math.max(0, hand[idx].cost - delta);
        setter((h: Card[]) => h.map((c: Card) => (c.uniqueId === targetUniqueId ? { ...c, cost: newCost } : c)));
      }
      break;
    }
    case "return_to_deck": {
      // extra_hand_return シナジー：暗器2回以上使用でもう1枚戻す
      const extraReturn = (card.synergy?.effect.type === "extra_hand_return" &&
        checkSynergy(card, context.fieldSize ?? 0, context.daggerCount ?? 0)) ? 1 : 0;
      const count = (card.effectValue ?? 1) + extraReturn;
      for (let i = 0; i < count; i++) {
        if (isPlayer) {
          if (enemyHandCards.length > 0) {
            const idx = Math.floor(Math.random() * enemyHandCards.length);
            const c = enemyHandCards[idx];
            setEnemyHandCards((h: Card[]) => h.filter((_, j: number) => j !== idx));
            setEnemyDeck((d: Card[]) => [...d, c]);
          }
        } else {
          if (playerHandCards.length > 0) {
            const idx = Math.floor(Math.random() * playerHandCards.length);
            const c = playerHandCards[idx];
            setPlayerHandCards((h: Card[]) => h.filter((_, j: number) => j !== idx));
            setDeck((d: Card[]) => [...d, c]);
          }
        }
      }
      break;
    }
    case "discard_hand": {
      const count = card.effectValue ?? 1;
      for (let i = 0; i < count; i++) {
        if (isPlayer) {
          context.setEnemyHandCards((hand: Card[]) => {
            const newHand = [...hand];
            if (newHand.length > 0) {
              const idx = Math.floor(Math.random() * newHand.length);
              const [removed] = newHand.splice(idx, 1);
              context.setEnemyGraveyard((g: Card[]) => [...g, removed]);
            }
            return newHand;
          });
        } else {
          context.setPlayerHandCards((hand: Card[]) => {
            const newHand = [...hand];
            if (newHand.length > 0) {
              const idx = Math.floor(Math.random() * newHand.length);
              const [removed] = newHand.splice(idx, 1);
              context.setPlayerGraveyard((g: Card[]) => [...g, removed]);
            }
            return newHand;
          });
        }
      }
      break;
    }
    case "steal_follower": {
      if (targetId !== "hero") {
        const sourceList = isPlayer ? enemyFieldCards : playerFieldCards;
        const destSetter = isPlayer ? setPlayerFieldCards : setEnemyFieldCards;
        const sourceSetter = isPlayer ? setEnemyFieldCards : setPlayerFieldCards;
        const stolen = sourceList.find((c) => c.uniqueId === targetId);
        if (stolen && (isPlayer ? playerFieldCards.length : enemyFieldCards.length) < MAX_FIELD_SIZE) {
          sourceSetter((list) => list.filter((c) => c.uniqueId !== targetId));
          destSetter((list) => [...list, { ...stolen }]);
          handleSummonEffect(stolen, isPlayer, context);
          handleSummonTrigger(stolen, isPlayer, context);
          executePlayEffects(stolen, isPlayer, context);
        }
      }
      break;
    }
    default:
      break;
  }

  executePlayEffects(card, isPlayer, context);
}

// ---------------------------------------------------------------------------
// フォロワー召喚処理
// ---------------------------------------------------------------------------

export function playCardToField(card: Card, isPlayer: boolean, context: PlayContext, selectedTargetIds?: string[]): void {
  if (card.type === "spell") return;

  const {
    setPlayerFieldCards,
    setEnemyFieldCards,
    setPlayerHandCards,
    setEnemyHandCards,
    setPlayerHeroHp,
    setEnemyHeroHp,
    setGameOver,
    stopTimer,
    setAiRunning,
    addCardToDestroying,
  } = context;

  const ownField = isPlayer ? context.playerFieldCards : context.enemyFieldCards;
  if (ownField.length >= MAX_FIELD_SIZE) return;

  const mana = isPlayer ? context.currentMana : context.enemyCurrentMana;
  const setMana = isPlayer ? context.setCurrentMana : context.setEnemyCurrentMana;
  if (card.cost > mana) return;
  setMana((m) => m - card.cost);

  const canAttack = !!(card.rush || card.superHaste);
  const fieldCard = createFieldCard(card, canAttack);
  const setOwnField = isPlayer ? setPlayerFieldCards : setEnemyFieldCards;
  setOwnField((f: RuntimeCard[]) => [...f, fieldCard]);

  const setOwnHand = isPlayer ? setPlayerHandCards : setEnemyHandCards;
  setOwnHand((h: Card[]) => h.filter((c: Card) => c.uniqueId !== card.uniqueId));

  setTimeout(() => {
    setOwnField((list) =>
      list.map((c) => (c.uniqueId === card.uniqueId ? { ...c, isAnimating: false } : c))
    );
  }, 600);

  handleSummonEffect(card, isPlayer, context, selectedTargetIds);
  handleSummonTrigger(card, isPlayer, context);

  executePlayEffects(card, isPlayer, context, selectedTargetIds);
}

// ---------------------------------------------------------------------------
// internal helpers
// ---------------------------------------------------------------------------

function handleSummonEffect(card: Card, isPlayer: boolean, ctx: PlayContext, selectedTargetIds?: string[]) {
  const se = card.summonEffect;
  if (!se) return;

  const dmgTargetSetter = isPlayer ? ctx.setEnemyFieldCards : ctx.setPlayerFieldCards;
  const heroSetter = isPlayer ? ctx.setEnemyHeroHp : ctx.setPlayerHeroHp;
  const graveSetter = isPlayer ? ctx.setEnemyGraveyard : ctx.setPlayerGraveyard;
  const fieldCards = isPlayer ? ctx.enemyFieldCards : ctx.playerFieldCards;

  if (se.type === "damage_all" && (se.value ?? 0) > 0) {
    const dmg = se.value ?? 1;
    dmgTargetSetter((list) => {
      const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
      const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
      if (dead.length) {
        ctx.addCardToDestroying(dead.map((d) => d.uniqueId));
        graveSetter((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
      }
      return updated.filter((c) => (c.hp ?? 0) > 0);
    });
  } else if (se.type === "damage_single" && (se.value ?? 0) > 0) {
    const dmg = se.value ?? 1;
    const selectedTarget = selectedTargetIds?.[0];

    if (selectedTarget === "hero") {
      heroSetter((h) => {
        const next = Math.max(h - dmg, 0);
        if (next <= 0) {
          ctx.setGameOver({ over: true, winner: isPlayer ? "player" : "enemy" });
          try { ctx.stopTimer(); } catch (_) {}
          ctx.setAiRunning(false);
        }
        return next;
      });
    } else if (selectedTarget) {
      dmgTargetSetter((list) => {
        const updated = list.map((c) => (c.uniqueId === selectedTarget ? { ...c, hp: (c.hp ?? 0) - dmg } : c));
        const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
        if (dead.length) {
          ctx.addCardToDestroying(dead.map((d) => d.uniqueId));
          graveSetter((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
        }
        return updated.filter((c) => (c.hp ?? 0) > 0);
      });
    } else if (fieldCards.length > 0) {
      const idx = Math.floor(Math.random() * fieldCards.length);
      const target = fieldCards[idx];
      dmgTargetSetter((list) => {
        const updated = list.map((c) => (c.uniqueId === target.uniqueId ? { ...c, hp: (c.hp ?? 0) - dmg } : c));
        const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
        if (dead.length) {
          ctx.addCardToDestroying(dead.map((d) => d.uniqueId));
          graveSetter((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
        }
        return updated.filter((c) => (c.hp ?? 0) > 0);
      });
    } else {
      heroSetter((h) => {
        const next = Math.max(h - dmg, 0);
        if (next <= 0) {
          ctx.setGameOver({ over: true, winner: isPlayer ? "player" : "enemy" });
          try { ctx.stopTimer(); } catch (_) {}
          ctx.setAiRunning(false);
        }
        return next;
      });
    }
  }
}

function handleSummonTrigger(card: Card, isPlayer: boolean, ctx: PlayContext) {
  const trig = card.summonTrigger;
  if (!trig) return;

  if (trig.type === "add_card_hand" && trig.cardId) {
    const addCard = cards.find((c) => c.id === trig.cardId);
    if (addCard) {
      const newCard = { ...addCard, uniqueId: uuidv4() };
      const setter = isPlayer ? ctx.setPlayerHandCards : ctx.setEnemyHandCards;
      setter((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
    }
  }
}
