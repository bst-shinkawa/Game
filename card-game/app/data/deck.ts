// deck.ts
import { cards, Card } from "./cards";

// 役割別固定デッキ（20枚）
const kingCardIds: number[] = [
  1,1,   // 勅命×2
  2,2,   // 近衛兵×2
  4,     // 騎兵×1
  5,     // 金の盃×1
  6,     // 砲撃×1
  7,7,   // 招集×2
  8,     // 隊長×1
  9,9,   // 突撃兵×2
  10,10, // 槍兵×2
  11,    // 一騎当千×1
  12,12, // 策士×2
  13,13, // 補給兵×2
  27,    // 城壁兵×1
];

const usurperCardIds: number[] = [
  14,14, // 暗躍×2
  15,    // 暗器×1
  16,16, // 影を縫う者×2
  17,17, // 携帯補給×2
  18,    // 簒奪者×1
  19,    // 裏切りの手引き×1
  20,20, // 破壊工作×2
  21,    // 市民の暴動×1
  22,22, // 裏取引の商人×2
  23,    // 闇夜の襲撃×1
  24,24, // 影の罠師×2
  25,25, // 毒瓶×2
  28,    // 夜襲者×1
];

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildDeckFromIds(ids: number[]): Card[] {
  const list: Card[] = [];
  ids.forEach((id) => {
    const card = cards.find((c) => c.id === id);
    if (card) list.push({ ...card, uniqueId: crypto.randomUUID() });
  });
  return shuffle(list);
}

export function createDeck(role: "king" | "usurper" = "king"): Card[] {
  return role === "king" ? buildDeckFromIds(kingCardIds) : buildDeckFromIds(usurperCardIds);
}
