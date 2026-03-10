/**
 * スペル使用処理を管理するサービス
 */

import type { Card } from "@/app/data/cards";
import type { SelectionConfig } from "@/app/types/gameTypes";

export interface SpellUsageConfig {
  card: Card;
  cardId: string;
  isPlayer: boolean;
  castSpell: (cardId: string, targetId: string | "hero", isPlayer: boolean) => void;
  playCardToField: (card: Card) => void;
  initializeSelection: (config: Omit<SelectionConfig, "selectedIds">) => void;
}

/**
 * スペル使用タイプを判定して適切な処理を実行
 */
export function handleSpellUsage(config: SpellUsageConfig): void {
  const { card, cardId, isPlayer, castSpell, playCardToField, initializeSelection } = config;
  const usageType = (card as any).usageType;

  switch (usageType) {
    case "cast_spell_auto":
      handleAutoSpell(cardId, castSpell, isPlayer);
      break;

    case "cast_spell_select_target":
      handleTargetSelectSpell(card, cardId, initializeSelection, castSpell, isPlayer);
      break;

    case "cast_spell_select_hand":
      handleHandSelectSpell(card, cardId, initializeSelection, castSpell, isPlayer);
      break;

    case "play_follower":
      if (card.type === "follower") {
        playCardToField(card);
      }
      break;

    default:
      console.warn(`Unknown usage type: ${usageType}`);
  }
}

/**
 * 自動実行スペル処理
 */
function handleAutoSpell(
  cardId: string,
  castSpell: (cardId: string, targetId: string | "hero", isPlayer: boolean) => void,
  isPlayer: boolean
): void {
  castSpell(cardId, "hero", isPlayer);
}

/**
 * 対象選択型スペル処理
 */
function handleTargetSelectSpell(
  card: Card,
  cardId: string,
  initializeSelection: (config: Omit<SelectionConfig, "selectedIds">) => void,
  castSpell: (cardId: string, targetId: string | "hero", isPlayer: boolean) => void,
  isPlayer: boolean
): void {
  const selectableTargets = (card as any).selectableTargets || ["hero", "field_card"];

  initializeSelection({
    sourceCardId: cardId,
    selectableTargets,
    selectCount: 1,
    onComplete: (selectedIds: string[]) => {
      if (selectedIds.length > 0) {
        const targetId = selectedIds[0] as string | "hero";
        castSpell(cardId, targetId, isPlayer);
      }
    },
    onCancel: () => {
      // キャンセル処理
    },
  });
}

/**
 * 手札選択型スペル処理
 */
function handleHandSelectSpell(
  card: Card,
  cardId: string,
  initializeSelection: (config: Omit<SelectionConfig, "selectedIds">) => void,
  castSpell: (cardId: string, targetId: string | "hero", isPlayer: boolean) => void,
  isPlayer: boolean
): void {
  const selectableTargets = (card as any).selectableTargets || ["hand_card"];
  const selectCount = (card as any).selectCount || 1;

  initializeSelection({
    sourceCardId: cardId,
    selectableTargets,
    selectCount,
    onComplete: (selectedIds: string[]) => {
      if (selectedIds.length > 0) {
        castSpell(cardId, selectedIds[0], isPlayer);
      }
    },
    onCancel: () => {
      // キャンセル処理
    },
  });
}

/**
 * フォロワー召喚処理
 */
export function handleFollowerPlay(card: Card, playCardToField: (card: Card) => void): void {
  if (card.type === "follower") {
    playCardToField(card);
  }
}

/**
 * スペル/フォロワーに基づいて処理を分岐
 */
export function handleCardUsage(
  card: Card,
  config: Omit<SpellUsageConfig, "card" | "cardId">
): void {
  if (card.type === "spell") {
    handleSpellUsage({ ...config, card, cardId: card.uniqueId });
  } else if (card.type === "follower") {
    handleFollowerPlay(card, config.playCardToField);
  }
}
