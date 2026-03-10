// game.ts
import { Card } from "./cards";
import { createDeck } from "./deck";

// 初期デッキは役割ごとに作り分け可能（デフォルトは王側）
export const deck: Card[] = createDeck("king");

// 初期手札を引く関数（修正版：使用したデッキも返す）
export function drawInitialHand(deck: Card[], count: number): { hand: Card[]; remaining: Card[] } {
  const deckCopy = [...deck];
  const hand: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (!deckCopy.length) break;
    hand.push(deckCopy.splice(Math.floor(Math.random() * deckCopy.length), 1)[0]);
  }
  return { hand, remaining: deckCopy };
}

export const MAX_MANA = 10;
