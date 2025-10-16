// cards.ts
export type CardType = "follower" | "spell";

export interface Card {
  id: number;
  name: string;
  type: CardType;
  attack?: number;
  hp?: number;
  maxHp?: number;
  image?: string;
  description?: string;
  uniqueId: string;
  cost: number;
  canAttack?: boolean;
  guard?: boolean;
  rush?: boolean;
}

// 仮カードデータ
export const cards: Card[] = [
  { id: 1, name: "剣士", type: "follower", attack: 3, hp: 2, maxHp: 2, image: "/img/cards/swordsman.png", uniqueId: "", cost: 1 },
  { id: 2, name: "炎の呪文", type: "spell", description: "相手に3ダメージ", image: "/img/cards/fire_spell.png", uniqueId: "", cost: 3 },
  { id: 3, name: "兵士", type: "follower", attack: 1, hp: 1, maxHp: 1, image: "/img/cards/soldier.png", uniqueId: "", cost: 1 },
  { id: 4, name: "弓兵", type: "follower", attack: 2, hp: 1, maxHp: 1, image: "/img/cards/archer.png", uniqueId: "", cost: 2 },
  { id: 5, name: "氷の呪文", type: "spell", description: "相手1体を凍結", image: "/img/cards/ice_spell.png", uniqueId: "", cost: 2 },
  { id: 6, name: "騎士", type: "follower", attack: 4, hp: 3, maxHp: 3, image: "/img/cards/knight.png", uniqueId: "", cost: 4 },
  { id: 7, name: "回復の呪文", type: "spell", description: "味方1体を回復", image: "/img/cards/heal_spell.png", uniqueId: "", cost: 2 },
  { id: 8, name: "槍兵", type: "follower", attack: 2, hp: 2, maxHp: 2, image: "/img/cards/spearman.png", uniqueId: "", cost: 2 },
  { id: 9, name: "火球", type: "spell", description: "相手全体に2ダメージ", image: "/img/cards/fireball_spell.png", uniqueId: "", cost: 3 },
  { id: 10, name: "斥候", type: "follower", attack: 1, hp: 2, maxHp: 2, image: "/img/cards/scout.png", uniqueId: "", cost: 1 },
  { id: 11, name: "雷撃", type: "spell", description: "相手1体に4ダメージ", image: "/img/cards/lightning_spell.png", uniqueId: "", cost: 4 },
  { id: 12, name: "魔導士", type: "follower", attack: 3, hp: 2, maxHp: 2, image: "/img/cards/mage.png", uniqueId: "", cost: 3 },
  { id: 13, name: "毒の呪文", type: "spell", description: "相手1体に毎ターン1ダメージ", image: "/img/cards/poison_spell.png", uniqueId: "", cost: 2 },
  { id: 14, name: "盾兵", type: "follower", attack: 1, hp: 4, maxHp: 4, image: "/img/cards/shieldman.png", uniqueId: "", cost: 2 },
  { id: 15, name: "加速の呪文", type: "spell", description: "自分の次のターンに+1行動", image: "/img/cards/haste_spell.png", uniqueId: "", cost: 1 }
];
