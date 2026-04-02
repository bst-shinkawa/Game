import { describe, it, expect, vi } from "vitest";
import { executeAttack } from "../attackService";
import type { RuntimeCard } from "../../types/gameTypes";
import type { Card } from "../../data/cards";

function makeRuntime(overrides: Partial<RuntimeCard> = {}): RuntimeCard {
  return {
    id: 1, name: "Test", type: "follower", cost: 2,
    attack: 3, hp: 4, maxHp: 4, uniqueId: "a1",
    canAttack: true,
    ...overrides,
  };
}

function makeContext(attackerList: RuntimeCard[], targetList: RuntimeCard[]) {
  let heroHp = 20;
  let gameOver = { over: false, winner: null as null | "player" | "enemy" };
  const apply = (val: any, prev: any) => typeof val === "function" ? val(prev) : val;
  return {
    attackerList,
    targetList,
    setAttackerList: vi.fn((updater: any) => { attackerList = apply(updater, attackerList); }),
    setTargetList: vi.fn((updater: any) => { targetList = apply(updater, targetList); }),
    setTargetHeroHp: vi.fn((updater: any) => { heroHp = apply(updater, heroHp); }),
    setAttackerGraveyard: vi.fn(),
    setTargetGraveyard: vi.fn(),
    setAttackerHandCards: vi.fn(),
    setTargetHandCards: vi.fn(),
    setGameOver: vi.fn((updater: any) => { gameOver = apply(updater, gameOver); }),
    stopTimer: vi.fn(),
    setAiRunning: vi.fn(),
    isPlayerAttacker: true,
    get heroHp() { return heroHp; },
    get gameOverState() { return gameOver; },
  };
}

describe("executeAttack", () => {
  it("deals damage to enemy hero", () => {
    const attacker = makeRuntime({ uniqueId: "a1", attack: 5 });
    const ctx = makeContext([attacker], []);
    const addCardToDestroying = vi.fn();

    executeAttack("a1", "hero", ctx, addCardToDestroying);

    expect(ctx.setTargetHeroHp).toHaveBeenCalledTimes(1);
    expect(ctx.heroHp).toBe(15);
    expect(ctx.setAttackerList).toHaveBeenCalled();
  });

  it("blocks rush card from attacking hero directly", () => {
    const attacker = makeRuntime({ uniqueId: "a1", rushInitialTurn: true, canAttack: true });
    const ctx = makeContext([attacker], []);
    const addCardToDestroying = vi.fn();

    executeAttack("a1", "hero", ctx, addCardToDestroying);

    expect(ctx.setTargetHeroHp).not.toHaveBeenCalled();
  });

  it("blocks hero attack when opponent has wallGuard", () => {
    const attacker = makeRuntime({ uniqueId: "a1" });
    const wall = makeRuntime({ uniqueId: "w1", wallGuard: true } as any);
    const ctx = makeContext([attacker], [wall]);
    const addCardToDestroying = vi.fn();

    executeAttack("a1", "hero", ctx, addCardToDestroying);

    expect(ctx.setTargetHeroHp).not.toHaveBeenCalled();
  });

  it("deals mutual damage in follower vs follower combat", () => {
    const attacker = makeRuntime({ uniqueId: "a1", attack: 3, hp: 4, maxHp: 4 });
    const target = makeRuntime({ uniqueId: "t1", attack: 2, hp: 3, maxHp: 3 });
    const ctx = makeContext([attacker], [target]);
    const addCardToDestroying = vi.fn();

    executeAttack("a1", "t1", ctx, addCardToDestroying);

    expect(ctx.setTargetList).toHaveBeenCalled();
    expect(ctx.setAttackerList).toHaveBeenCalled();
  });

  it("triggers game over when hero hp reaches 0", () => {
    const attacker = makeRuntime({ uniqueId: "a1", attack: 25 });
    const ctx = makeContext([attacker], []);
    const addCardToDestroying = vi.fn();

    executeAttack("a1", "hero", ctx, addCardToDestroying);

    expect(ctx.heroHp).toBe(0);
    expect(ctx.setGameOver).toHaveBeenCalledTimes(1);
    expect(ctx.gameOverState.over).toBe(true);
    expect(ctx.gameOverState.winner).toBe("player");
  });

  it("applies bonus_vs_hero extra damage", () => {
    const attacker = makeRuntime({ uniqueId: "a1", attack: 3, onAttackEffect: "bonus_vs_hero" });
    const ctx = makeContext([attacker], []);
    const addCardToDestroying = vi.fn();

    executeAttack("a1", "hero", ctx, addCardToDestroying);

    // base 3 + bonus 3 = 6 damage
    expect(ctx.heroHp).toBe(14);
  });
});
