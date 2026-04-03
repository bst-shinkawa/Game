/**
 * 選択モード処理を管理するサービス
 */

import type { SelectionMode, SelectionConfig } from "@/app/types/gameTypes";

export interface SelectionManager {
  mode: SelectionMode;
  config: SelectionConfig | null;
  initializeSelection: (config: Omit<SelectionConfig, "selectedIds">) => void;
  applySelection: (targetIds: string[]) => void;
  cancelSelection: () => void;
  isSelectable: (
    mode: SelectionMode,
    config: SelectionConfig | null,
    targetType: "hero" | "field_card" | "hand_card"
  ) => boolean;
}

/**
 * 選択対象がこのモードで選択可能かを判定
 */
export function isSelectableTarget(
  selectionMode: SelectionMode,
  selectionConfig: SelectionConfig | null,
  targetType: "hero" | "field_card" | "hand_card" | "own_hero" | "own_field_card"
): boolean {
  if (selectionMode === "none" || !selectionConfig) {
    return false;
  }

  return selectionConfig.selectableTargets.includes(targetType);
}

/**
 * 敵ヒーローが選択可能か
 */
export function isEnemyHeroSelectable(
  selectionMode: SelectionMode,
  selectionConfig: SelectionConfig | null
): boolean {
  return isSelectableTarget(selectionMode, selectionConfig, "hero");
}

/**
 * 敵フィールドカードが選択可能か
 */
export function isEnemyFieldCardSelectable(
  selectionMode: SelectionMode,
  selectionConfig: SelectionConfig | null
): boolean {
  return isSelectableTarget(selectionMode, selectionConfig, "field_card");
}

/**
 * 自陣ヒーローが選択可能か（heal_single など自陣対象スペル用）
 */
export function isOwnHeroSelectable(
  selectionMode: SelectionMode,
  selectionConfig: SelectionConfig | null
): boolean {
  return isSelectableTarget(selectionMode, selectionConfig, "own_hero");
}

/**
 * 自陣フィールドカードが選択可能か（heal_single など自陣対象スペル用）
 */
export function isOwnFieldCardSelectable(
  selectionMode: SelectionMode,
  selectionConfig: SelectionConfig | null
): boolean {
  return isSelectableTarget(selectionMode, selectionConfig, "own_field_card");
}

/**
 * 手札カードが選択可能か
 */
export function isHandCardSelectable(
  selectionMode: SelectionMode,
  selectionConfig: SelectionConfig | null,
  cardOwner: "player" | "enemy"
): boolean {
  // 手札選択は特定のモードでのみ有効
  if (selectionMode !== "select_hand_card" || !selectionConfig) {
    return false;
  }

  return selectionConfig.selectableTargets.includes("hand_card");
}

/**
 * 選択数が上限に達したか
 */
export function isSelectionComplete(
  selectedCount: number,
  requiredCount: number
): boolean {
  return selectedCount >= requiredCount;
}

/**
 * 選択内容を検証
 */
export function validateSelection(
  selectedIds: string[],
  config: SelectionConfig
): boolean {
  return (
    selectedIds.length > 0 &&
    selectedIds.length <= config.selectCount &&
    selectedIds.length === new Set(selectedIds).size // 重複チェック
  );
}

/**
 * 手札から敵の手札をフィルター（選択対象用）
 */
export function filterSelectableHandCards(
  handCards: any[],
  selectionConfig: SelectionConfig | null
): any[] {
  if (!selectionConfig?.selectableTargets.includes("hand_card")) {
    return [];
  }

  return handCards;
}

/**
 * フィールドカードから選択可能なカードをフィルター
 */
export function filterSelectableFieldCards(
  fieldCards: any[],
  selectionConfig: SelectionConfig | null
): any[] {
  if (!selectionConfig?.selectableTargets.includes("field_card")) {
    return [];
  }

  return fieldCards;
}
