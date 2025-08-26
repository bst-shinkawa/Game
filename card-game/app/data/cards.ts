// cards.ts
export type CardType = "follower" | "spell";

export interface Card {
  id: number;
  name: string;
  type: CardType;
  attack?: number;
  hp?: number;
  image?: string;
  description?: string;
  uniqueId: string; // 必須化
}

// 仮カードデータ
export const cards: Card[] = [
  { id: 1, name: "剣士", type: "follower", attack: 3, hp: 2, image: "/images/cards/swordsman.png", uniqueId: "" },
  { id: 2, name: "炎の呪文", type: "spell", description: "相手に3ダメージ", image: "/images/cards/fire_spell.png", uniqueId: "" },
  { id: 3, name: "兵士", type: "follower", attack: 1, hp: 1, image: "/images/cards/soldier.png", uniqueId: "" },
  { id: 4, name: "弓兵", type: "follower", attack: 2, hp: 1, image: "/images/cards/archer.png", uniqueId: "" },
  { id: 5, name: "氷の呪文", type: "spell", description: "相手1体を凍結", image: "/images/cards/ice_spell.png", uniqueId: "" },
  { id: 6, name: "騎士", type: "follower", attack: 4, hp: 3, image: "/images/cards/knight.png", uniqueId: "" },
  { id: 7, name: "回復の呪文", type: "spell", description: "味方1体を回復", image: "/images/cards/heal_spell.png", uniqueId: "" },
  { id: 8, name: "槍兵", type: "follower", attack: 2, hp: 2, image: "/images/cards/spearman.png", uniqueId: "" },
  { id: 9, name: "火球", type: "spell", description: "相手全体に2ダメージ", image: "/images/cards/fireball_spell.png", uniqueId: "" },
  { id: 10, name: "斥候", type: "follower", attack: 1, hp: 2, image: "/images/cards/scout.png", uniqueId: "" },
  { id: 11, name: "雷撃", type: "spell", description: "相手1体に4ダメージ", image: "/images/cards/lightning_spell.png", uniqueId: "" },
  { id: 12, name: "魔導士", type: "follower", attack: 3, hp: 2, image: "/images/cards/mage.png", uniqueId: "" },
  { id: 13, name: "毒の呪文", type: "spell", description: "相手1体に毎ターン1ダメージ", image: "/images/cards/poison_spell.png", uniqueId: "" },
  { id: 14, name: "盾兵", type: "follower", attack: 1, hp: 4, image: "/images/cards/shieldman.png", uniqueId: "" },
  { id: 15, name: "加速の呪文", type: "spell", description: "自分の次のターンに+1行動", image: "/images/cards/haste_spell.png", uniqueId: "" }
];
