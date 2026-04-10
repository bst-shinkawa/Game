import { describe, it, expect, vi } from "vitest";
import { executePlayEffects } from "../effectService";
import type { PlayContext } from "../effectService";
import type { Card } from "../../data/cards";
import type { RuntimeCard } from "../../types/gameTypes";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 99, name: "Test", type: "follower", cost: 2,
    attack: 1, hp: 1, uniqueId: "test-1",
    ...overrides,
  };
}

function makePlayContext(overrides: Partial<PlayContext> = {}): PlayContext {
  return {
    playerFieldCards: [],
    enemyFieldCards: [],
    setPlayerFieldCards: vi.fn(),
    setEnemyFieldCards: vi.fn(),
    playerHandCards: [],
    enemyHandCards: [],
    setPlayerHandCards: vi.fn(),
    setEnemyHandCards: vi.fn(),
    playerGraveyard: [],
    enemyGraveyard: [],
    setPlayerGraveyard: vi.fn(),
    setEnemyGraveyard: vi.fn(),
    setPlayerHeroHp: vi.fn(),
    setEnemyHeroHp: vi.fn(),
    setGameOver: vi.fn(),
    stopTimer: vi.fn(),
    setAiRunning: vi.fn(),
    addCardToDestroying: vi.fn(),
    setDeck: vi.fn(),
    setEnemyDeck: vi.fn(),
    currentMana: 10,
    setCurrentMana: vi.fn(),
    enemyCurrentMana: 10,
    setEnemyCurrentMana: vi.fn(),
    drawPlayerCard: vi.fn(),
    drawEnemyCard: vi.fn(),
    drawPlayerCards: vi.fn(),
    drawEnemyCards: vi.fn(),
    ...overrides,
  };
}

describe("executePlayEffects", () => {
  it("does nothing when card has no onPlayEffects", () => {
    const card = makeCard();
    const ctx = makePlayContext();
    executePlayEffects(card, true, ctx);

    expect(ctx.drawPlayerCards).not.toHaveBeenCalled();
    expect(ctx.setPlayerFieldCards).not.toHaveBeenCalled();
  });

  it("draws cards for player with draw effect", () => {
    const card = makeCard({ onPlayEffects: [{ type: "draw", count: 2 }] });
    const ctx = makePlayContext();
    executePlayEffects(card, true, ctx);

    expect(ctx.drawPlayerCards).toHaveBeenCalledWith(2);
  });

  it("draws cards for enemy with draw effect", () => {
    const card = makeCard({ onPlayEffects: [{ type: "draw", count: 1 }] });
    const ctx = makePlayContext();
    executePlayEffects(card, false, ctx);

    expect(ctx.drawEnemyCards).toHaveBeenCalledWith(1);
  });

  it("adds specific card to hand with add_card effect", () => {
    const card = makeCard({
      onPlayEffects: [{ type: "add_card", cardId: 15, count: 2 }],
    });
    const ctx = makePlayContext();
    executePlayEffects(card, true, ctx);

    // addCardToHand calls setPlayerHandCards
    expect(ctx.setPlayerHandCards).toHaveBeenCalledTimes(2);
  });

  it("summons token to own field with summon_token effect", async () => {
    vi.useFakeTimers();
    try {
      const card = makeCard({
        onPlayEffects: [{ type: "summon_token", cardId: 2, count: 2 }],
      });
      const ctx = makePlayContext();
      executePlayEffects(card, true, ctx);

      expect(ctx.setPlayerFieldCards).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(600);
      expect(ctx.setPlayerFieldCards).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("respects MAX_FIELD_SIZE for summon_token", () => {
    const card = makeCard({
      onPlayEffects: [{ type: "summon_token", cardId: 2, count: 3 }],
    });
    const fullField = Array.from({ length: 4 }, (_, i) =>
      ({ id: i, name: `F${i}`, type: "follower" as const, cost: 1, uniqueId: `f${i}`, maxHp: 1 } as RuntimeCard)
    );
    const ctx = makePlayContext({ playerFieldCards: fullField });
    executePlayEffects(card, true, ctx);

    // only 1 token should be summoned (field has 4, max is 5)
    expect(ctx.setPlayerFieldCards).toHaveBeenCalledTimes(1);
  });

  it("freezes a random enemy follower with freeze_random_enemy", () => {
    const card = makeCard({
      onPlayEffects: [{ type: "freeze_random_enemy", count: 1 }],
    });
    const enemyField = [
      { id: 1, name: "E1", type: "follower" as const, cost: 1, uniqueId: "e1", maxHp: 2 } as RuntimeCard,
    ];
    const ctx = makePlayContext({ enemyFieldCards: enemyField });
    executePlayEffects(card, true, ctx);

    expect(ctx.setEnemyFieldCards).toHaveBeenCalledTimes(1);
  });

  it("steals from opponent graveyard with steal_graveyard effect", () => {
    const card = makeCard({
      onPlayEffects: [{ type: "steal_graveyard", maxCost: 2, count: 1 }],
    });
    const enemyGrave = [
      makeCard({ uniqueId: "g1", cost: 1, name: "Cheap" }),
      makeCard({ uniqueId: "g2", cost: 5, name: "Expensive" }),
    ];
    const ctx = makePlayContext({ enemyGraveyard: enemyGrave });
    executePlayEffects(card, true, ctx);

    // should add one card (cost ≤ 2) to player hand
    expect(ctx.setPlayerHandCards).toHaveBeenCalledTimes(1);
  });

  it("does not steal when no eligible cards in graveyard", () => {
    const card = makeCard({
      onPlayEffects: [{ type: "steal_graveyard", maxCost: 2, count: 1 }],
    });
    const enemyGrave = [makeCard({ uniqueId: "g1", cost: 5 })];
    const ctx = makePlayContext({ enemyGraveyard: enemyGrave });
    executePlayEffects(card, true, ctx);

    expect(ctx.setPlayerHandCards).not.toHaveBeenCalled();
  });

  it("executes multiple effects in sequence", () => {
    const card = makeCard({
      onPlayEffects: [
        { type: "steal_graveyard", maxCost: 2, count: 1 },
        { type: "add_card", cardId: 15, count: 1 },
      ],
    });
    const enemyGrave = [makeCard({ uniqueId: "g1", cost: 1 })];
    const ctx = makePlayContext({ enemyGraveyard: enemyGrave });
    executePlayEffects(card, true, ctx);

    // steal_graveyard + add_card = 2 calls to setPlayerHandCards
    expect(ctx.setPlayerHandCards).toHaveBeenCalledTimes(2);
  });
});
