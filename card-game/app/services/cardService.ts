// カード操作に関するサービス
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";
import { MAX_HAND } from "../constants/gameConstants";

/**
 * 手札にカードを追加する（手札が満杯の場合は墓地へ） 
 * 重複を防ぐため、同じ uniqueId のカードが既に手札に存在する場合はスキップします
 */
export function addCardToHand(
  card: Card,
  handList: Card[],
  setHandList: React.Dispatch<React.SetStateAction<Card[]>>,
  graveyardList: Card[],
  setGraveyardList: React.Dispatch<React.SetStateAction<Card[]>>
): void {
  setHandList((prev) => {
    // 同じ uniqueId を持つカードが既に存在する場合は追加しない（重複防止）
    if (card.uniqueId && prev.some((c) => c.uniqueId === card.uniqueId)) {
      console.warn(`重複したカードの追加を防止しました: ${card.name} (${card.uniqueId})`);
      return prev;
    }

    if (prev.length >= MAX_HAND) {
      setGraveyardList((gPrev) => [...gPrev, card]);
      console.log(`${card.name} は手札があふれたため破棄されました`);
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
