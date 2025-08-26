// deck.ts
import { cards, Card } from "./cards";

// デッキ構築（30枚、同じカードは最大2枚）
export function createDeck(): Card[] {
  const deck: Card[] = [];

  while (deck.length < 30) {
    const candidate = cards[Math.floor(Math.random() * cards.length)];
    const countInDeck = deck.filter(c => c.id === candidate.id).length;
    if (countInDeck < 2) {
      deck.push({ ...candidate, uniqueId: crypto.randomUUID() });
    }
  }

  return deck;
}
