// カード操作に関するサービス
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
import { MAX_HAND } from "../constants/gameConstants";

/**
 * 手札にカードを追加する（手札が満杯の場合は墓地へ）
 * setter 関数内で最新 state を参照するため stale closure の心配がない
 */
export function addCardToHand(
  card: Card,
  setHandList: React.Dispatch<React.SetStateAction<Card[]>>,
  setGraveyardList: React.Dispatch<React.SetStateAction<Card[]>>
): void {
  setHandList((prev) => {
    if (card.uniqueId && prev.some((c) => c.uniqueId === card.uniqueId)) {
      return prev;
    }
    if (prev.length >= MAX_HAND) {
      setGraveyardList((gPrev) => [...gPrev, card]);
      return prev;
    }
    return [...prev, card];
  });
}

/**
 * カードにユニークIDを付与する
 */
export function createUniqueCard(card: Card): Card {
  return { ...card, uniqueId: uuidv4() };
}

/**
 * フィールドカードを作成する
 */
export function createFieldCard(
  card: Card,
  canAttack: boolean = false
): RuntimeCard {
  return {
    ...card,
    uniqueId: card.uniqueId || uuidv4(),
    maxHp: card.hp ?? 0,
    canAttack,
    rushInitialTurn: card.rush ? true : undefined,
    isAnimating: true,
  };
}
