// シナジー条件チェックと効果値計算のユーティリティ
import type { Card } from "../data/cards";

/** cost_by_dagger 対象カード id と、手札にそれがある状態で打出した暗器の回数 */
export type CostByDaggerPlayStacks = { 23: number; 28: number };

export const EMPTY_COST_BY_DAGGER_STACKS: CostByDaggerPlayStacks = { 23: 0, 28: 0 };

/** シナジー条件が満たされているかを判定する */
export function checkSynergy(card: Card, fieldSize: number, daggerCount: number): boolean {
  if (!card.synergy) return false;
  const { condition } = card.synergy;
  if (condition.type === "field_size_gte") return fieldSize >= condition.threshold;
  if (condition.type === "dagger_used_gte") return daggerCount >= condition.threshold;
  return false;
}

/** damage_bonus シナジーの追加ダメージ量を返す */
export function getSynergyDamageBonus(card: Card, fieldSize: number, daggerCount: number): number {
  if (!checkSynergy(card, fieldSize, daggerCount)) return 0;
  if (card.synergy?.effect.type !== "damage_bonus") return 0;
  return card.synergy.effect.value ?? 0;
}

/** cost_reduce シナジーによるコスト軽減量を返す（ターン内暗器回数・場の条件のみ） */
export function getSynergyCostReduction(card: Card, fieldSize: number, daggerCount: number): number {
  if (!card.synergy) return 0;
  const { effect } = card.synergy;
  if (effect.type === "cost_reduce" && checkSynergy(card, fieldSize, daggerCount)) {
    return effect.value ?? 0;
  }
  return 0;
}

/** cost_by_dagger：対象カードが手札にある状態で打出した暗器（id:15）1回につきコストが1下がる */
export function getCostByDaggerReduction(card: Card, stacks: CostByDaggerPlayStacks): number {
  if (!card.synergy || card.synergy.effect.type !== "cost_by_dagger") return 0;
  if (card.id !== 23 && card.id !== 28) return 0;
  const n = stacks[card.id as keyof CostByDaggerPlayStacks];
  return Math.min(card.cost, Math.max(0, n));
}

/** シナジーを加味した有効コストを返す */
export function getEffectiveCost(
  card: Card,
  fieldSize: number,
  turnDaggerCount: number,
  costByDaggerStacks: CostByDaggerPlayStacks = EMPTY_COST_BY_DAGGER_STACKS
): number {
  return Math.max(
    0,
    card.cost
      - getSynergyCostReduction(card, fieldSize, turnDaggerCount)
      - getCostByDaggerReduction(card, costByDaggerStacks)
  );
}

/** attack_bonus シナジーの追加攻撃力を返す */
export function getSynergyAttackBonus(card: Card, fieldSize: number, daggerCount: number): number {
  if (!checkSynergy(card, fieldSize, daggerCount)) return 0;
  if (card.synergy?.effect.type !== "attack_bonus") return 0;
  return card.synergy.effect.value ?? 0;
}
