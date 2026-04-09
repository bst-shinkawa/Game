// カード操作に関するサービス
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../data/cards";
import { cards } from "../data/cards";
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

/**
 * 破壊時に手札へ戻すカード用。場でのバフ・ダメージを捨て、cards データの元スタッツに戻す。
 * return_to_hand_once は一度きりのため deathTrigger を付けない。
 */
export function normalizeReturnedHandCardFromRuntime(deadCard: RuntimeCard): Card {
  const base = deadCard.id != null ? cards.find((c) => c.id === deadCard.id) : undefined;
  if (base) {
    const returned = { ...base, uniqueId: uuidv4() } as Card;
    delete (returned as { deathTrigger?: unknown }).deathTrigger;
    return returned;
  }
  const returned: Record<string, unknown> = {
    ...deadCard,
    uniqueId: uuidv4(),
    hp: deadCard.maxHp ?? deadCard.hp ?? 1,
  };
  delete returned.deathTrigger;
  delete returned.canAttack;
  delete returned.rushInitialTurn;
  delete returned.isAnimating;
  delete returned.frozen;
  delete returned.poison;
  delete returned.poisonDamage;
  delete returned.baseAttack;
  delete returned.baseHp;
  return returned as unknown as Card;
}
