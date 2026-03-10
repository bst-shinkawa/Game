// ゲーム関連の型定義
import type { Card } from "../data/cards";

export type GameMode = "cpu" | "pvp";
export type CoinResult = "deciding" | "player" | "enemy";
export type Winner = null | "player" | "enemy";

// カード使用方法の種類
export type CardUsageType = 
  | "play_follower"           // フォロワーをフィールドに出す（ドラッグ）
  | "cast_spell_auto"         // スペルで効果が自動発動
  | "cast_spell_select_target" // スペルでターゲット選択が必要
  | "cast_spell_select_hand"   // スペルで手札から1枚選択が必要
  | "draw_cards";              // ドロー効果カード

// 選択モードの情報
export type SelectionMode = "none" | "select_target" | "select_hand_card";

export interface SelectionConfig {
  sourceCardId: string;          // 効果を発動したカード
  selectableTargets: ("hero" | "field_card" | "hand_card")[];
  selectCount: number;           // 選択対象数
  selectedIds: string[];         // 既に選択されたID
  onCancel?: () => void;
  onComplete?: (selectedIds: string[]) => void;
}

export interface GameOverState {
  over: boolean;
  winner: Winner;
}

export interface RuntimeCard extends Card {
  maxHp: number;
  canAttack?: boolean;
  isAnimating?: boolean;
  poison?: number;
  poisonDamage?: number;
  frozen?: number;
  rushInitialTurn?: boolean;
}

export interface AttackAnimation {
  attackerId: string;
  targetId: string | "hero";
}

export interface EnemyAttackAnimation {
  sourceCardId: string | null;
  targetId: string | "hero";
}

export interface EnemySpellAnimation {
  targetId: string | "hero";
  effect: string;
}
