// シナジー条件チェックと効果値計算のユーティリティ
import type { Card } from "../data/cards";

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

/** cost_reduce / cost_by_dagger シナジーによるコスト軽減量を返す */
export function getSynergyCostReduction(card: Card, fieldSize: number, daggerCount: number): number {
  if (!card.synergy) return 0;
  const { effect } = card.synergy;
  if (effect.type === "cost_reduce" && checkSynergy(card, fieldSize, daggerCount)) {
    return effect.value ?? 0;
  }
  if (effect.type === "cost_by_dagger" && checkSynergy(card, fieldSize, daggerCount)) {
    return daggerCount;
  }
  return 0;
}

/** シナジーを加味した有効コストを返す */
export function getEffectiveCost(card: Card, fieldSize: number, daggerCount: number): number {
  return Math.max(0, card.cost - getSynergyCostReduction(card, fieldSize, daggerCount));
}

/** attack_bonus シナジーの追加攻撃力を返す */
export function getSynergyAttackBonus(card: Card, fieldSize: number, daggerCount: number): number {
  if (!checkSynergy(card, fieldSize, daggerCount)) return 0;
  if (card.synergy?.effect.type !== "attack_bonus") return 0;
  return card.synergy.effect.value ?? 0;
}
