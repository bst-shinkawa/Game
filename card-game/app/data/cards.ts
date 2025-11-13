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
  // spell 用の効果を識別するためのフィールド（任意）。
  // 例: 'damage_single' | 'damage_all' | 'heal_single' | 'poison' | 'haste' など
  effect?: string;
  // effect に付随する数値や状態持続ターン数などを持たせられるようにする
  // 例: effectValue: ダメージ量や回復量、statusDuration: 状態の持続ターン
  effectValue?: number;
  status?: string; // 'poison' | 'freeze' | 'haste' など（補助的）
  statusDuration?: number;
  // 召喚時効果や攻撃時効果をデータで指定できるようにする
  summonEffect?: { type: string; value?: number; status?: string; statusDuration?: number };
  onAttackEffect?: string; // 例: 'self_damage_1', 'bonus_vs_hero'
  stealth?: boolean; // 隠密（攻撃するまで対象にできない）
  rush?: boolean; // 突撃（出したターン相手フォロワーのみ攻撃可能）
  superHaste?: boolean; // 神速（出したターンからフォロワー・ヒーロー共に攻撃可能）
  wallGuard?: boolean; // 鉄壁（このカードがいる限り、自分以外への攻撃をブロック）
  summonTrigger?: { type: string; cardId?: number }; // 召喚時トリガー（例: 'add_card_hand'）
  deathTrigger?: { type: string; cardId?: number }; // 死亡時トリガー（例: 'add_card_hand'）
  uniqueId: string;
  cost: number;
  canAttack?: boolean;
  guard?: boolean;
}

// 仮カードデータ
const basePath = process.env.NODE_ENV === 'production' ? '/Game' : '';
export const cards: Card[] = [
  { id: 1, name: "剣士", type: "follower", description: "攻撃時に1ダメージを自身が受ける", attack: 3, hp: 2, maxHp: 2, image: `${basePath}/img/cards/swordsman.png`, uniqueId: "", cost: 1, onAttackEffect: "self_damage_1" },
  { id: 2, name: "炎の呪文", type: "spell", description: "相手に3ダメージ", effect: "damage_single", effectValue: 3, image: `${basePath}/img/cards/fire_spell.png`, uniqueId: "", cost: 3 },
  { id: 3, name: "兵士", type: "follower", description: "突撃：出したターンから相手フォロワーのみ攻撃可能", attack: 1, hp: 1, maxHp: 1, image: `${basePath}/img/cards/soldier.png`, uniqueId: "", cost: 1, rush: true },
  { id: 4, name: "弓兵", type: "follower", description: "隠密：攻撃するまで対象にならない", attack: 2, hp: 1, maxHp: 1, image: `${basePath}/img/cards/archer.png`, uniqueId: "", cost: 2, stealth: true },
  { id: 5, name: "氷の呪文", type: "spell", description: "相手1体を凍結", effect: "freeze_single", image: `${basePath}/img/cards/ice_spell.png`, uniqueId: "", cost: 2 },
  { id: 6, name: "騎士", type: "follower", description: "召喚時に相手全体に1ダメージ", attack: 4, hp: 3, maxHp: 3, image: `${basePath}/img/cards/knight.png`, uniqueId: "", cost: 4, summonEffect: { type: "damage_all", value: 1 } },
  { id: 7, name: "回復の呪文", type: "spell", description: "味方1体を2回復", effect: "heal_single", effectValue: 2, image: `${basePath}/img/cards/heal_spell.png`, uniqueId: "", cost: 2 },
  { id: 8, name: "槍兵", type: "follower", description: "相手ヒーローへ攻撃時にこのカードの攻撃力を上乗せして攻撃", attack: 2, hp: 2, maxHp: 2, image: `${basePath}/img/cards/spearman.png`, uniqueId: "", cost: 2, onAttackEffect: "bonus_vs_hero" },
  { id: 9, name: "火球", type: "spell", description: "相手全体に2ダメージ", effect: "damage_all", effectValue: 2, image: `${basePath}/img/cards/fireball_spell.png`, uniqueId: "", cost: 3 },
  { id: 10, name: "斥候", type: "follower", description: "倒されたとき手札に兵士を加える", attack: 1, hp: 2, maxHp: 2, image: `${basePath}/img/cards/scout.png`, uniqueId: "", cost: 1, deathTrigger: { type: "add_card_hand", cardId: 3 } },
  { id: 11, name: "雷撃", type: "spell", description: "相手1体に4ダメージ", effect: "damage_single", effectValue: 4, image: `${basePath}/img/cards/lightning_spell.png`, uniqueId: "", cost: 4 },
  { id: 12, name: "魔導士", type: "follower", description: "召喚時に火球を手札に加える", attack: 3, hp: 2, maxHp: 2, image: `${basePath}/img/cards/mage.png`, uniqueId: "", cost: 3, summonTrigger: { type: "add_card_hand", cardId: 9 } },
  { id: 13, name: "毒の呪文", type: "spell", description: "相手1体に毎ターン1ダメージ", effect: "poison", effectValue: 1, status: "poison", statusDuration: 3, image: `${basePath}/img/cards/poison_spell.png`, uniqueId: "", cost: 2 },
  { id: 14, name: "盾兵", type: "follower", description: "鉄壁：このカードがいる間、自分以外への攻撃をブロック", attack: 1, hp: 4, maxHp: 4, image: `${basePath}/img/cards/shieldman.png`, uniqueId: "", cost: 2, wallGuard: true },
  { id: 15, name: "加速の呪文", type: "spell", description: "出したフォロワーに突撃を付与", effect: "haste", status: "haste", statusDuration: 1, image: `${basePath}/img/cards/haste_spell.png`, uniqueId: "", cost: 1 },
  { id: 16, name: "神速の戦士", type: "follower", description: "神速：出したターンからフォロワー・ヒーローに攻撃可能", attack: 2, hp: 2, maxHp: 2, image: `${basePath}/img/cards/super_haste.png`, uniqueId: "", cost: 3, superHaste: true }
];
