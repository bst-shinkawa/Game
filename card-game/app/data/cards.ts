// cards.ts
import type { CardUsageType } from "../types/gameTypes";

export type CardType = "follower" | "spell";
export type EffectType = 
  | "damage_single" 
  | "damage_all" 
  | "poison" 
  | "freeze_single" 
  | "heal_single" 
  | "haste"
  | "draw_cards"      // 手札をドローするタイプ
  | "reduce_cost"     // 手札のカードを軽減する
  | "return_to_deck"  // 相手の手札を山札に戻す
  | "steal_follower"  // 相手の場のフォロワーを奪う
  | "summon_token"    // トークンを召喚する
  | "discard_hand";   // 相手の手札をランダムに（または選択で）捨てさせる
export type TriggerType = 
  | "add_card_hand" 
  | "damage_single"
  | "end_turn_add_card"    // ターン終了時にカードを加える
  | "return_to_hand_once"; // 破壊時一度だけ手札に戻す
export type OnAttackEffectType = "self_damage_1" | "bonus_vs_hero";

// ---------------------------------------------------------------------------
// カードのプレイ時/スペル発動時に自動実行される追加効果（データ駆動）
// card.id による分岐を排除し、カードデータに効果を宣言的に記述する
// ---------------------------------------------------------------------------
export type PlayEffectType =
  | "draw"                 // 自分の山札からドロー
  | "add_card"             // 特定カードを手札に追加
  | "summon_token"         // トークンを自陣に召喚
  | "summon_buffed"        // バフ付きカードを召喚
  | "steal_graveyard"      // 相手墓地からカードを奪取
  | "discard_own"          // 自分の手札をランダムに捨てる
  | "freeze_random_enemy"; // 相手フォロワーをランダムに凍結

export interface CardPlayEffect {
  type: PlayEffectType;
  count?: number;          // 回数 (default: 1)
  cardId?: number;         // 追加/召喚するカードの id
  maxCost?: number;        // steal_graveyard 用: コスト上限
  buff?: { attack?: number; hp?: number };
  noTrigger?: boolean;     // 召喚トリガーを抑制
  canAttack?: boolean;     // 召喚直後に攻撃可能か
}

export interface Card {
  id: number;
  name: string;
  type: CardType;
  attack?: number;
  hp?: number;
  maxHp?: number;
  image?: string;
  description?: string;
  effect?: EffectType;
  effectValue?: number;
  status?: string;
  statusDuration?: number;
  summonEffect?: { type: string; value?: number; status?: string; statusDuration?: number };
  onAttackEffect?: OnAttackEffectType;
  stealth?: boolean;
  rush?: boolean;
  superHaste?: boolean;
  wallGuard?: boolean;
  summonTrigger?: { type: TriggerType; cardId?: number; cardIds?: number[] };
  deathTrigger?: { type: TriggerType; cardId?: number };
  owner?: "king" | "usurper" | "neutral";
  token?: boolean;
  uniqueId: string;
  cost: number;
  canAttack?: boolean;
  guard?: boolean;
  usageType?: CardUsageType;
  selectableTargets?: ("hero" | "field_card" | "hand_card")[];
  selectCount?: number;
  summonSelectableTargets?: ("hero" | "field_card" | "hand_card")[];
  onPlayEffects?: CardPlayEffect[];
}

// RuntimeCard は gameTypes.ts で定義（重複を防ぐため re-export）
export type { RuntimeCard } from "../types/gameTypes";

// 仮カードデータ
const basePath = process.env.NODE_ENV === 'production' ? '' : '';
export const cards: Card[] = [
  // --- 王サイドカード ---
  { id: 1, name: "勅命", type: "spell", description: "カードを二枚ドローする", effect: "draw_cards", effectValue: 2, image: `${basePath}/img/cards/royal_decree.webp`, uniqueId: "", cost: 2, owner: "king", usageType: "cast_spell_auto" },
  { id: 2, name: "近衛兵", type: "follower", description: "守護", attack: 1, hp: 2, maxHp: 2, image: `${basePath}/img/cards/royal_guard.webp`, uniqueId: "", cost: 1, wallGuard: true, owner: "king", usageType: "play_follower" },
  { id: 3, name: "弓兵", type: "follower", description: "召喚時相手の場のヒーローかフォロワーへ1ダメージを与える", attack: 2, hp: 1, maxHp: 1, image: `${basePath}/img/cards/archer.webp`, uniqueId: "", cost: 2, summonEffect: { type: "damage_single", value: 1 }, owner: "king", usageType: "play_follower", summonSelectableTargets: ["hero", "field_card"] },
  { id: 4, name: "騎兵", type: "follower", description: "召喚時相手の場の全体に1ダメージ", attack: 4, hp: 3, maxHp: 3, image: `${basePath}/img/cards/cavalry.webp`, uniqueId: "", cost: 4, summonEffect: { type: "damage_all", value: 1 }, owner: "king", usageType: "play_follower" },
  { id: 5, name: "金の盃", type: "spell", description: "ヒーローかフォロワーの体力を2回復", effect: "heal_single", effectValue: 2, image: `${basePath}/img/cards/golden_goblet.webp`, uniqueId: "", cost: 2, owner: "king", usageType: "cast_spell_select_target", selectableTargets: ["hero", "field_card"] },
  { id: 6, name: "砲撃", type: "spell", description: "敵のヒーローか場のフォロワーに対して3ダメージ", effect: "damage_single", effectValue: 3, image: `${basePath}/img/cards/artillery_strike.webp`, uniqueId: "", cost: 3, owner: "king", usageType: "cast_spell_select_target", selectableTargets: ["hero", "field_card"] },
  { id: 7, name: "招集", type: "spell", description: "フィールドに近衛兵を2枚召喚する", effect: "summon_token", image: `${basePath}/img/cards/mobilize.webp`, uniqueId: "", cost: 3, owner: "king", usageType: "cast_spell_auto", onPlayEffects: [{ type: "summon_token", cardId: 2, count: 2 }] },
  { id: 8, name: "隊長", type: "follower", description: "召喚時フィールドに突撃兵を2枚だしスタッツを+2ずつする", attack: 4, hp: 5, maxHp: 5, image: `${basePath}/img/cards/captain.webp`, uniqueId: "", cost: 6, owner: "king", usageType: "play_follower", onPlayEffects: [{ type: "summon_buffed", cardId: 9, count: 2, buff: { attack: 2, hp: 2 }, canAttack: true }] },
  { id: 9, name: "突撃兵", type: "follower", description: "突撃。破壊後は手札に戻る（2回目以降はこの効果を失う）", attack: 1, hp: 1, maxHp: 1, image: `${basePath}/img/cards/assault_trooper.webp`, uniqueId: "", cost: 1, rush: true, token: true, deathTrigger: { type: "return_to_hand_once" }, owner: "king", usageType: "play_follower" },
  { id: 10, name: "槍兵", type: "follower", description: "攻撃時自分の攻撃力を上乗せしたダメージを与える", attack: 2, hp: 2, maxHp: 2, image: `${basePath}/img/cards/spearman.webp`, uniqueId: "", cost: 2, onAttackEffect: "bonus_vs_hero", owner: "king", usageType: "play_follower" },
  { id: 11, name: "一騎当千", type: "spell", description: "相手全体に3ダメージを与える、そのごフィールドに王の右腕を召喚（5・1疾走フォロワー）", effect: "damage_all", effectValue: 3, image: `${basePath}/img/cards/tactician.webp`, uniqueId: "", cost: 8, owner: "king", usageType: "cast_spell_auto", onPlayEffects: [{ type: "summon_token", cardId: 26, count: 1, canAttack: true }] },
  { id: 12, name: "策士", type: "follower", description: "召喚時手札からカード1枚ドロー", attack: 2, hp: 2, maxHp: 2, image: `${basePath}/img/cards/supply_trooper.webp`, uniqueId: "", cost: 3, owner: "king", usageType: "play_follower", onPlayEffects: [{ type: "draw", count: 1 }] },
  { id: 13, name: "補給兵", type: "follower", description: "ターン終了時に手札に砲撃と金の盃を手札に加える", attack: 2, hp: 3, maxHp: 3, image: `${basePath}/img/cards/one_man_army.webp`, uniqueId: "", cost: 4, owner: "king", summonTrigger: { type: "end_turn_add_card", cardIds: [6, 5] }, usageType: "play_follower" },
  // token for One‑Armed King
  { id: 26, name: "王の右腕", type: "follower", description: "疾走", attack: 5, hp: 1, maxHp: 1, image: `${basePath}/img/cards/arm.png`, uniqueId: "", cost: 0, rush: true, token: true, owner: "king", usageType: "play_follower" },
  // --- 簒奪者サイドカード ---
  { id: 14, name: "暗躍", type: "spell", description: "自分の手札のカードを一枚のコストを1下げる。手札に暗器を2枚加える", effect: "reduce_cost", effectValue: 1, image: `${basePath}/img/cards/clandestine_operation.webp`, uniqueId: "", cost: 1, owner: "usurper", usageType: "cast_spell_select_hand", selectableTargets: ["hand_card"], onPlayEffects: [{ type: "add_card", cardId: 15, count: 2 }] },
  { id: 15, name: "暗器", type: "spell", description: "相手のフォロワーかヒーローに1ダメージ", effect: "damage_single", effectValue: 1, image: `${basePath}/img/cards/hidden_dagger.webp`, uniqueId: "", cost: 1, owner: "usurper", usageType: "cast_spell_select_target", selectableTargets: ["hero", "field_card"] },
  { id: 16, name: "影を縫う者", type: "follower", description: "召喚時手札に暗器を1枚加える", attack: 2, hp: 2, maxHp: 2, image: `${basePath}/img/cards/shadow_stitcher.webp`, uniqueId: "", cost: 2, summonTrigger: { type: "add_card_hand", cardId: 15 }, owner: "usurper", usageType: "play_follower" },
  { id: 17, name: "携帯補給", type: "spell", description: "自分のヒーローのHPを1回復。暗器を一枚手札に加える", effect: "heal_single", effectValue: 1, image: `${basePath}/img/cards/portable_supply.webp`, uniqueId: "", cost: 2, owner: "usurper", usageType: "cast_spell_auto", onPlayEffects: [{ type: "add_card", cardId: 15, count: 1 }] },
  { id: 18, name: "簒奪者", type: "follower", description: "相手のカードを一枚ランダムに墓地から手札に加える。（加えるカードは2コスト以下のみ）暗器を一枚手札に加える", attack: 2, hp: 3, maxHp: 3, image: `${basePath}/img/cards/usurper.png`, uniqueId: "", cost: 3, owner: "usurper", usageType: "play_follower", onPlayEffects: [{ type: "steal_graveyard", maxCost: 2, count: 1 }, { type: "add_card", cardId: 15, count: 1 }] },
  { id: 19, name: "裏切りの手引き", type: "spell", description: "相手の場のフォロワーを一枚自分の場に配置しなおす（召喚効果も発動）", effect: "steal_follower", image: `${basePath}/img/cards/betrayal_guidance.webp`, uniqueId: "", cost: 5, owner: "usurper", usageType: "cast_spell_select_target", selectableTargets: ["field_card"] },
  { id: 20, name: "破壊工作", type: "spell", description: "相手の手札一枚を山札へ戻す。暗器を1枚手札に加える", effect: "return_to_deck", image: `${basePath}/img/cards/sabotage.webp`, uniqueId: "", cost: 2, owner: "usurper", usageType: "cast_spell_auto", onPlayEffects: [{ type: "add_card", cardId: 15, count: 1 }] },
  { id: 21, name: "市民の暴動", type: "spell", description: "相手の手札を二枚山札へ戻す。暗躍を1枚手札に加える", effect: "return_to_deck", effectValue: 2, image: `${basePath}/img/cards/civil_riot.webp`, uniqueId: "", cost: 4, owner: "usurper", usageType: "cast_spell_auto", onPlayEffects: [{ type: "add_card", cardId: 14, count: 1 }] },
  { id: 22, name: "裏取引の商人", type: "follower", description: "召喚時、自分の手札から一枚選んで捨てる。金の盃を一枚手札に加える", attack: 1, hp: 2, maxHp: 2, image: `${basePath}/img/cards/black_market_merchant.webp`, uniqueId: "", cost: 2, owner: "usurper", usageType: "play_follower", summonSelectableTargets: ["hand_card"], onPlayEffects: [{ type: "discard_own", count: 1 }, { type: "add_card", cardId: 5, count: 1 }] },
  { id: 23, name: "闇夜の襲撃", type: "spell", description: "相手は手札を2枚ランダムに捨てさせ、自分の場に影を縫う者を2体召喚（召喚効果は発動しない）", effect: "discard_hand", effectValue: 2, image: `${basePath}/img/cards/night_raid.webp`, uniqueId: "", cost: 7, owner: "usurper", usageType: "cast_spell_auto", onPlayEffects: [{ type: "summon_token", cardId: 16, count: 2, noTrigger: true }] },
  { id: 24, name: "影の罠師", type: "follower", description: "召喚時、相手のフォロワー1体を次のターンを行動不能にする。", attack: 2, hp: 1, maxHp: 1, image: `${basePath}/img/cards/shadow_trapper.webp`, uniqueId: "", cost: 2, owner: "usurper", usageType: "play_follower", onPlayEffects: [{ type: "freeze_random_enemy", count: 1 }] },
  { id: 25, name: "毒瓶", type: "spell", description: "相手のフォロワーに2ダメージ", effect: "damage_single", effectValue: 2, image: `${basePath}/img/cards/poison_vial.webp`, uniqueId: "", cost: 2, owner: "usurper", usageType: "cast_spell_select_target", selectableTargets: ["field_card"] }
];
