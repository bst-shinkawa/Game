// effectService.ts
// Centralized engine for applying card effects and handling play-time logic.

import { v4 as uuidv4 } from "uuid";
import type { Card, EffectType, TriggerType } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
import { cards } from "../data/cards";
import { addCardToHand, createFieldCard } from "./cardService";
import { MAX_FIELD_SIZE, MAX_HAND } from "../constants/gameConstants";
import type { SpellContext } from "./spellService"; // reuse existing context

// -----------------------------------------------------------------------------
// contextual types used by both play and spell handling
// -----------------------------------------------------------------------------

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
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>;
  stopTimer: () => void;
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>;
  addCardToDestroying: (cardIds: string[]) => void;
  setDeck: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyDeck: React.Dispatch<React.SetStateAction<Card[]>>;
  currentMana: number;
  setCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  enemyCurrentMana: number;
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  drawPlayerCard: () => void;
  drawEnemyCard: () => void;
}

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

/**
 * Handle casting of a spell card; basically delegates to spellService logic but
 * accepts a superset context and also processes any extra data-driven effects.
 */
export function applySpell(
  card: Card,
  targetId: string | "hero",
  isPlayer: boolean,
  context: SpellContext & PlayContext
) {
  // castSpell from spellService already contains most of the core logic. we
  // simply call it and then handle effect types that were previously scattered
  // among callers (draw_cards, reduce_cost, return_to_deck, etc.).
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
    drawPlayerCard,
    drawEnemyCard,
  } = context;

  // apply base effect
  // note: spellService.castSpell is imported dynamically to avoid cyclic deps
  import("./spellService").then((svc) => {
    svc.castSpell(card, targetId, isPlayer, context);

    // additional "custom" effects that are easier to handle here
    switch (card.effect) {
      case "draw_cards": {
        const count = card.effectValue ?? 1;
        for (let i = 0; i < count; i++) {
          if (isPlayer) drawPlayerCard();
          else drawEnemyCard();
        }
        break;
      }
      case "reduce_cost": {
        const delta = card.effectValue ?? 1;
        const hand = isPlayer ? playerHandCards : enemyHandCards;
        const setter = isPlayer ? setPlayerHandCards : setEnemyHandCards;
        const idx = hand.findIndex((c: Card) => c.cost > 0 && c.uniqueId !== card.uniqueId);
        if (idx !== -1) {
          const newCard = { ...hand[idx], cost: Math.max(0, hand[idx].cost - delta) };
          setter((h: Card[]) => h.map((c: Card, i: number) => (i === idx ? newCard : c)));
        }

        // 暗躍 / 市民の暴動の副次効果
        if (card.id === 14) {
          const dagger = cards.find((c) => c.id === 15);
          if (dagger) {
            for (let i = 0; i < 2; i++) {
              const newCard = { ...dagger, uniqueId: uuidv4() };
              if (isPlayer) addCardToHand(newCard, playerHandCards, setPlayerHandCards, playerGraveyard, setPlayerGraveyard);
              else addCardToHand(newCard, enemyHandCards, setEnemyHandCards, enemyGraveyard, setEnemyGraveyard);
            }
          }
        }
        break;
      }
      case "return_to_deck": {
        const count = card.effectValue ?? 1;
        for (let i = 0; i < count; i++) {
          if (isPlayer) {
            if (enemyHandCards.length > 0) {
              let idx: number;
              if (typeof window !== 'undefined') {
                const choice = window.prompt(
                  `敵の手札から戻すカード番号を選んでください\n` +
                    enemyHandCards.map((c, j: number) => `${j}: ${c.name}`).join("\n")
                );
                const parsed = parseInt(choice || "", 10);
                if (!isNaN(parsed) && parsed >= 0 && parsed < enemyHandCards.length) {
                  idx = parsed;
                } else {
                  idx = Math.floor(Math.random() * enemyHandCards.length);
                }
              } else {
                idx = Math.floor(Math.random() * enemyHandCards.length);
              }
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
        // 市民の暴動 ライオット: 暗躍を追加
        if (card.id === 21) {
          const darkPlay = cards.find((c) => c.id === 14);
          if (darkPlay) {
            const newCard = { ...darkPlay, uniqueId: uuidv4() };
            if (isPlayer) addCardToHand(newCard, playerHandCards, setPlayerHandCards, playerGraveyard, setPlayerGraveyard);
            else addCardToHand(newCard, enemyHandCards, setEnemyHandCards, enemyGraveyard, setEnemyGraveyard);
          }
        }
        break;
      }
      case "discard_hand": {
        const count = card.effectValue ?? 1;
        for (let i = 0; i < count; i++) {
          if (isPlayer) {
            context.setEnemyHandCards((hand: Card[]) => {
              let newHand = [...hand];
              if (newHand.length > 0) {
                const idx = Math.floor(Math.random() * newHand.length);
                const [removed] = newHand.splice(idx, 1);
                context.setEnemyGraveyard((g: Card[]) => [...g, removed]);
              }
              return newHand;
            });
          } else {
            context.setPlayerHandCards((hand: Card[]) => {
              let newHand = [...hand];
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
        // copy logic from previous code
        if (targetId !== "hero") {
          const sourceList = isPlayer ? enemyFieldCards : playerFieldCards;
          const destSetter = isPlayer ? setPlayerFieldCards : setEnemyFieldCards;
          const sourceSetter = isPlayer ? setEnemyFieldCards : setPlayerFieldCards;
          const stolen = sourceList.find((c) => c.uniqueId === targetId);
          if (stolen && (isPlayer ? playerFieldCards.length : enemyFieldCards.length) < MAX_FIELD_SIZE) {
            sourceSetter((list) => list.filter((c) => c.uniqueId !== targetId));
            destSetter((list) => [...list, { ...stolen }]);
            if (stolen.summonEffect) {
              if (stolen.summonEffect.type === "damage_all" && (stolen.summonEffect.value ?? 0) > 0) {
                const dmg = stolen.summonEffect.value ?? 1;
                const oppSetter = isPlayer ? setEnemyFieldCards : setPlayerFieldCards;
                oppSetter((list) =>
                  list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }))
                );
              }
            }
          }
        }
        break;
      }
      case "summon_token": {
        if (card.id === 7) {
          const guard = cards.find((c) => c.id === 2);
          if (guard) {
            for (let i = 0; i < 2; i++) {
              if ((isPlayer ? playerFieldCards : enemyFieldCards).length >= MAX_FIELD_SIZE) break;
              const token = createFieldCard(guard, false);
              if (isPlayer) setPlayerFieldCards((f: RuntimeCard[]) => [...f, token]);
              else setEnemyFieldCards((f: RuntimeCard[]) => [...f, token]);
            }
          }
        }
        break;
      }
      default:
        break;
    }

    // card-specific follow-ups
    if (card.id === 11) {
      // 一騎当千: 全体ダメージ後に王の右腕を召喚
      const arm = cards.find((c) => c.id === 26);
      if (arm) {
        const token = createFieldCard(arm, true);
        if (isPlayer) context.setPlayerFieldCards((f: RuntimeCard[]) => [...f, token]);
        else context.setEnemyFieldCards((f: RuntimeCard[]) => [...f, token]);
      }
    }

    if (card.id === 17 || card.id === 20) {
      // 携帯補給 / 破壊工作: 暗器を1枚手札へ
      const dagger = cards.find((c) => c.id === 15);
      if (dagger) {
        const newCard = { ...dagger, uniqueId: uuidv4() };
        if (isPlayer) addCardToHand(newCard, playerHandCards, setPlayerHandCards, playerGraveyard, setPlayerGraveyard);
        else addCardToHand(newCard, enemyHandCards, setEnemyHandCards, enemyGraveyard, setEnemyGraveyard);
      }
    }

    if (card.id === 23) {
      // 闇夜の襲撃: すでに effect "discard_hand" removed two cards; now summon two sewer tokens
      const sewer = cards.find((c) => c.id === 16);
      if (sewer) {
        const ownField = isPlayer ? playerFieldCards : enemyFieldCards;
        if (ownField.length > 0) {
          for (let i = 0; i < 2; i++) {
            const token = { ...createFieldCard(sewer, false) } as RuntimeCard;
            // remove summon trigger so they don't draw additional dark weapons
            delete token.summonTrigger;
            if (isPlayer) context.setPlayerFieldCards((f: RuntimeCard[]) => [...f, token]);
            else context.setEnemyFieldCards((f: RuntimeCard[]) => [...f, token]);
          }
        }
      }
    }

  });
}

/**
 * Place a follower into the field and run all associated side-effects.
 */
export function playCardToField(card: Card, isPlayer: boolean, context: PlayContext): void {
  if (card.type === "spell") {
    console.log("スペルはフィールドに出せません。ターゲットにドロップして使用してください。");
    return;
  }

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
    setPlayerGraveyard,
    enemyGraveyard,
    setEnemyGraveyard,
    setPlayerHeroHp,
    setEnemyHeroHp,
    setGameOver,
    stopTimer,
    setAiRunning,
    addCardToDestroying,
    drawPlayerCard,
    drawEnemyCard,
  } = context;

  const ownField = isPlayer ? playerFieldCards : enemyFieldCards;
  if (ownField.length >= MAX_FIELD_SIZE) {
    console.log("フィールドは最大5体までです。");
    return;
  }

  const mana = isPlayer ? context.currentMana : context.enemyCurrentMana;
  const setMana = isPlayer ? context.setCurrentMana : context.setEnemyCurrentMana;
  if (card.cost > mana) {
    console.log("マナが足りません！");
    return;
  }
  setMana((m) => m - card.cost);

  const canAttack = !!(card.rush || card.superHaste);
  const fieldCard = createFieldCard(card, canAttack);
  if (isPlayer) setPlayerFieldCards((f: RuntimeCard[]) => [...f, fieldCard]);
  else setEnemyFieldCards((f: RuntimeCard[]) => [...f, fieldCard]);

  // remove from hand
  if (isPlayer) setPlayerHandCards((h: Card[]) => h.filter((c: Card) => c.uniqueId !== card.uniqueId));
  else setEnemyHandCards((h: Card[]) => h.filter((c: Card) => c.uniqueId !== card.uniqueId));

  // アニメーション終了
  setTimeout(() => {
    if (isPlayer) {
      setPlayerFieldCards((list) =>
        list.map((c) => (c.uniqueId === card.uniqueId ? { ...c, isAnimating: false } : c))
      );
    } else {
      setEnemyFieldCards((list) =>
        list.map((c) => (c.uniqueId === card.uniqueId ? { ...c, isAnimating: false } : c))
      );
    }
  }, 600);

  // shared helpers
  handleSummonEffect(card, isPlayer, context);
  handleSummonTrigger(card, isPlayer, context);
  handleIdSpecificPlay(card, isPlayer, context);
}

// -----------------------------------------------------------------------------
// implementations of helpers
// -----------------------------------------------------------------------------

function handleSummonEffect(card: Card, isPlayer: boolean, ctx: PlayContext) {
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
    heroSetter((h) => {
      const next = Math.max(h - (se.value ?? 0), 0);
      if (next <= 0) {
        ctx.setGameOver({ over: true, winner: isPlayer ? "player" : "enemy" });
        try { ctx.stopTimer(); } catch (e) {}
        ctx.setAiRunning(false);
      }
      return next;
    });
  } else if (se.type === "damage_single" && (se.value ?? 0) > 0) {
    const dmg = se.value ?? 1;
    if (fieldCards.length > 0) {
      const idx = Math.floor(Math.random() * fieldCards.length);
      const target = fieldCards[idx];
      dmgTargetSetter((list) => list.map((c) =>
        c.uniqueId === target.uniqueId ? { ...c, hp: (c.hp ?? 0) - dmg } : c
      ));
      const dead = fieldCards.filter((c) => (c.hp ?? 0) - dmg <= 0);
      if (dead.length) {
        ctx.addCardToDestroying(dead.map((d) => d.uniqueId));
        graveSetter((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
      }
    } else {
      heroSetter((h) => {
        const next = Math.max(h - dmg, 0);
        if (next <= 0) {
          ctx.setGameOver({ over: true, winner: isPlayer ? "player" : "enemy" });
          try { ctx.stopTimer(); } catch (e) {}
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
      const hand = isPlayer ? ctx.playerHandCards : ctx.enemyHandCards;
      setter((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
    }
  } else if (trig.type === "end_turn_add_card") {
    // handled elsewhere by game loop
  }
}

function handleIdSpecificPlay(card: Card, isPlayer: boolean, ctx: PlayContext) {
  // previously inline id-based logic now centralized
  if (card.id === 12) {
    // 策士：ドロー
    ctx.drawPlayerCard();
  }
  if (card.id === 8) {
    // 隊長：2x突撃兵 +2/+2
    const attacker = cards.find((c) => c.id === 9);
    if (attacker) {
      for (let i = 0; i < 2; i++) {
        if ((isPlayer ? ctx.playerFieldCards : ctx.enemyFieldCards).length >= MAX_FIELD_SIZE) break;
        const token = createFieldCard(attacker, true);
        token.attack! += 2;
        token.hp! += 2;
        token.maxHp! += 2;
        if (isPlayer) ctx.setPlayerFieldCards((f) => [...f, token]);
        else ctx.setEnemyFieldCards((f) => [...f, token]);
      }
    }
  }
  if (card.id === 18) {
    // 簒奪者処理
    const opponentGrave = isPlayer ? ctx.enemyGraveyard : ctx.playerGraveyard;
    const valid = opponentGrave.filter((c) => c.cost <= 2);
    if (valid.length > 0) {
      const chosen = valid[Math.floor(Math.random() * valid.length)];
      const newCard = { ...chosen, uniqueId: uuidv4() };
      if (isPlayer) addCardToHand(newCard, ctx.playerHandCards, ctx.setPlayerHandCards, ctx.playerGraveyard, ctx.setPlayerGraveyard);
      else addCardToHand(newCard, ctx.enemyHandCards, ctx.setEnemyHandCards, ctx.enemyGraveyard, ctx.setEnemyGraveyard);
    }
    const dagger = cards.find((c) => c.id === 15);
    if (dagger) {
      const newCard = { ...dagger, uniqueId: uuidv4() };
      if (isPlayer) addCardToHand(newCard, ctx.playerHandCards, ctx.setPlayerHandCards, ctx.playerGraveyard, ctx.setPlayerGraveyard);
      else addCardToHand(newCard, ctx.enemyHandCards, ctx.setEnemyHandCards, ctx.enemyGraveyard, ctx.setEnemyGraveyard);
    }
  }
  if (card.id === 22) {
    // 裏取引の商人
    const hand = isPlayer ? ctx.playerHandCards : ctx.enemyHandCards;
    if (hand.length > 0) {
      const idx = Math.floor(Math.random() * hand.length);
      const discarded = hand[idx];
      if (isPlayer) ctx.setPlayerHandCards((h) => h.filter((_, i) => i !== idx));
      else ctx.setEnemyHandCards((h) => h.filter((_, i) => i !== idx));
      if (isPlayer) ctx.setPlayerGraveyard((g) => [...g, discarded]);
      else ctx.setEnemyGraveyard((g) => [...g, discarded]);
    }
    const chalice = cards.find((c) => c.id === 5);
    if (chalice) {
      const newCard = { ...chalice, uniqueId: uuidv4() };
      if (isPlayer) addCardToHand(newCard, ctx.playerHandCards, ctx.setPlayerHandCards, ctx.playerGraveyard, ctx.setPlayerGraveyard);
      else addCardToHand(newCard, ctx.enemyHandCards, ctx.setEnemyHandCards, ctx.enemyGraveyard, ctx.setEnemyGraveyard);
    }
  }
  if (card.id === 24) {
    // 影の罠師
    const setter = isPlayer ? ctx.setEnemyFieldCards : ctx.setPlayerFieldCards;
    const list = isPlayer ? ctx.enemyFieldCards : ctx.playerFieldCards;
    if (list.length > 0) {
      const idx = Math.floor(Math.random() * list.length);
      setter((l) => l.map((c, i) => (i === idx ? { ...c, frozen: 1 } : c)));
    }
  }
}
