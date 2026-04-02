import { describe, it, expect, vi } from "vitest";
import { addCardToHand, createUniqueCard, createFieldCard } from "../cardService";
import type { Card } from "../../data/cards";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1, name: "Test Card", type: "follower", cost: 2,
    attack: 3, hp: 4, uniqueId: "card-1",
    ...overrides,
  };
}

describe("addCardToHand", () => {
  it("adds a card to hand via setter", () => {
    let hand: Card[] = [];
    const setHand = vi.fn((updater: any) => { hand = updater(hand); });
    const setGrave = vi.fn();

    const card = makeCard({ uniqueId: "c1" });
    addCardToHand(card, setHand, setGrave);

    expect(setHand).toHaveBeenCalledTimes(1);
    expect(hand).toHaveLength(1);
    expect(hand[0].uniqueId).toBe("c1");
    expect(setGrave).not.toHaveBeenCalled();
  });

  it("sends to graveyard when hand is full (10 cards)", () => {
    const fullHand = Array.from({ length: 10 }, (_, i) => makeCard({ uniqueId: `h${i}` }));
    let hand = fullHand;
    let grave: Card[] = [];
    const setHand = vi.fn((updater: any) => { hand = updater(hand); });
    const setGrave = vi.fn((updater: any) => { grave = updater(grave); });

    const card = makeCard({ uniqueId: "overflow" });
    addCardToHand(card, setHand, setGrave);

    expect(hand).toHaveLength(10);
    expect(setGrave).toHaveBeenCalledTimes(1);
    expect(grave).toHaveLength(1);
    expect(grave[0].uniqueId).toBe("overflow");
  });

  it("prevents duplicate uniqueId", () => {
    let hand = [makeCard({ uniqueId: "dup" })];
    const setHand = vi.fn((updater: any) => { hand = updater(hand); });
    const setGrave = vi.fn();

    const card = makeCard({ uniqueId: "dup" });
    addCardToHand(card, setHand, setGrave);

    expect(hand).toHaveLength(1);
  });
});

describe("createUniqueCard", () => {
  it("assigns a uniqueId to a card", () => {
    const card = makeCard({ uniqueId: "" });
    const result = createUniqueCard(card);
    expect(result.uniqueId).toBeTruthy();
    expect(result.uniqueId).not.toBe("");
  });

  it("does not mutate original card", () => {
    const card = makeCard({ uniqueId: "original" });
    const result = createUniqueCard(card);
    expect(card.uniqueId).toBe("original");
    expect(result.uniqueId).not.toBe("original");
  });
});

describe("createFieldCard", () => {
  it("creates a RuntimeCard with maxHp and canAttack=false by default", () => {
    const card = makeCard({ hp: 5 });
    const field = createFieldCard(card);
    expect(field.maxHp).toBe(5);
    expect(field.canAttack).toBe(false);
    expect(field.isAnimating).toBe(true);
  });

  it("respects canAttack=true for rush cards", () => {
    const card = makeCard({ rush: true });
    const field = createFieldCard(card, true);
    expect(field.canAttack).toBe(true);
    expect(field.rushInitialTurn).toBe(true);
  });
});
