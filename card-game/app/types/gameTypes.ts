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

export interface CardRevealState {
  card: Card;
  targetId?: string | "hero";
  type: "spell" | "follower";
}

// ---------------------------------------------------------------------------
// enemyAI に渡すコンテキスト（25+個の引数を1つにまとめる）
// ---------------------------------------------------------------------------
export interface AIGameContext {
  // 敵側 state
  enemyDeck: Card[];
  enemyHandCards: Card[];
  enemyGraveyard: Card[];
  enemyFieldCards: RuntimeCard[];
  enemyCurrentMana: number;
  enemyHeroHp: number;

  // プレイヤー側 state (AI が参照する読み取り専用データ)
  playerFieldCards: RuntimeCard[];
  playerHeroHp: number;
  playerHandCards: Card[];
  playerGraveyard: Card[];

  // 敵側 setter
  setEnemyDeck: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyHandCards: React.Dispatch<React.SetStateAction<Card[]>>;
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  setEnemyHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;

  // プレイヤー側 setter
  setPlayerHandCards: React.Dispatch<React.SetStateAction<Card[]>>;
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<RuntimeCard[]>>;
  setPlayerHeroHp: React.Dispatch<React.SetStateAction<number>>;
  setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>;
  setPlayerDeck: React.Dispatch<React.SetStateAction<Card[]>>;

  // ゲーム制御
  setGameOver: React.Dispatch<React.SetStateAction<GameOverState>>;
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>;

  // アニメーション
  setMovingAttack: React.Dispatch<React.SetStateAction<AttackAnimation | null>>;
  setEnemyAttackAnimation: React.Dispatch<React.SetStateAction<EnemyAttackAnimation | null>>;
  setEnemySpellAnimation: React.Dispatch<React.SetStateAction<EnemySpellAnimation | null>>;

  // アクション
  attack: (attackerId: string, targetId: string | "hero", isPlayerAttacker: boolean) => void;
  endTurn: () => void;
  stopTimer: () => void;
  drawPlayerCard: () => void;
  drawEnemyCard: () => void;
  drawPlayerCards: (count: number) => void;
  drawEnemyCards: (count: number) => void;
  addCardToDestroying: (cardIds: string[]) => void;
  cancelRef: React.MutableRefObject<boolean>;

  // AI行動ログ
  addActionLog: (message: string, icon?: string) => void;

  // カード演出（中央表示→ターゲットへ飛ぶ）
  showCardReveal: (card: Card, targetId: string | "hero" | undefined, type: "spell" | "follower") => void;
  clearCardReveal: () => void;
}
