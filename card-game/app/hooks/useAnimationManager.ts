// アニメーション管理に関するフック
import { useState, useCallback } from "react";

export function useAnimationManager() {
  const [destroyingCards, setDestroyingCards] = useState<Set<string>>(new Set());
  const [movingAttack, setMovingAttack] = useState<{ attackerId: string; targetId: string | "hero" } | null>(null);
  const [enemyAttackAnimation, setEnemyAttackAnimation] = useState<{ sourceCardId: string | null; targetId: string | "hero" } | null>(null);
  const [enemySpellAnimation, setEnemySpellAnimation] = useState<{ targetId: string | "hero"; effect: string } | null>(null);

  const addCardToDestroying = useCallback((cardIds: string[]) => {
    const newSet = new Set(destroyingCards);
    cardIds.forEach(id => newSet.add(id));
    setDestroyingCards(newSet);

    // 600ms後に削除（CSS アニメーション時間に合わせる）
    setTimeout(() => {
      setDestroyingCards(prev => {
        const next = new Set(prev);
        cardIds.forEach(id => next.delete(id));
        return next;
      });
    }, 600);
  }, [destroyingCards]);

  return {
    destroyingCards,
    movingAttack,
    setMovingAttack,
    enemyAttackAnimation,
    setEnemyAttackAnimation,
    enemySpellAnimation,
    setEnemySpellAnimation,
    addCardToDestroying,
  };
}
