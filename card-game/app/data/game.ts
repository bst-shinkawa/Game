// game.ts
import { Card } from "./cards";
import { createDeck } from "./deck";

export const deck: Card[] = createDeck();

// 初期手札を引く関数
export function drawInitialHand(deck: Card[], count: number): Card[] {
  const deckCopy = [...deck];
  const hand: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (!deckCopy.length) break;
    hand.push(deckCopy.splice(Math.floor(Math.random() * deckCopy.length), 1)[0]);
  }
  return hand;
}

