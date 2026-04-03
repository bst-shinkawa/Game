// 状態効果に関するサービス
import type { RuntimeCard } from "../types/gameTypes";

/**
 * 状態効果を処理する（毒ダメージ、凍結のデクリメントなど）
 */
export function processStatusEffects(
  fieldCards: RuntimeCard[]
): {
  updated: RuntimeCard[];
  dead: RuntimeCard[];
} {
  const updated = fieldCards.map((c) => {
    let card = { ...c } as any;
    
    // 毒ダメージ処理
    if (card.poison && card.poison > 0) {
      const dmg = card.poisonDamage ?? 1;
      card.hp = (card.hp ?? 0) - dmg;
      card.poison = Math.max(0, card.poison - 1);
    }
    
    // 凍結中: このターンは攻撃不可。カウンターをデクリメント。
    if (card.frozen && card.frozen > 0) {
      card.canAttack = false;
      card.frozen = Math.max(0, card.frozen - 1);
    }
    
    return card;
  });
  
  const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
  const alive = updated.filter((c) => (c.hp ?? 0) > 0);
  
  return { updated: alive, dead };
}
