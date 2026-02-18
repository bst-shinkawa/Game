// ゲーム関連の型定義
import type { Card } from "../data/cards";

export type GameMode = "cpu" | "pvp";
export type CoinResult = "deciding" | "player" | "enemy";
export type Winner = null | "player" | "enemy";

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
