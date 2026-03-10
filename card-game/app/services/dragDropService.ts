/**
 * ドラッグ＆ドロップ処理を管理するサービス
 */

export interface DragDropHandler {
  onDragStart?: (cardId: string, e: React.DragEvent | PointerEvent | TouchEvent) => void;
  onDragEnd?: (cardId: string) => void;
  onDrop?: (dropTarget: string | null, cardId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

export interface DragDropState {
  activeCardId: string | null;
  dragPosition: { x: number; y: number };
  isDragging: boolean;
}

export interface PotentialDragState {
  startX: number;
  startY: number;
  element: HTMLElement;
  cardId: string;
  startTime: number;
  started: boolean;
  finish: () => void;
  onMove: (x: number, y: number, isEnd?: boolean) => boolean;
  forceStart: () => void;
}

const DRAG_THRESHOLD = 5;
const POINTER_MOVE_THRESHOLD = 10;

/**
 * ポインターイベント用のドラッグ開始判定
 */
export function beginPotentialDrag(
  startX: number,
  startY: number,
  element: HTMLElement,
  cardId: string,
  onDragStart?: (cardId: string, pos: { x: number; y: number }) => void
): PotentialDragState {
  const startTime = Date.now();
  let started = false;

  const onMove = (x: number, y: number, isEnd: boolean = false): boolean => {
    if (started) return true;

    const dx = x - startX;
    const dy = y - startY;
    const distance = Math.hypot(dx, dy);

    if (distance > POINTER_MOVE_THRESHOLD) {
      started = true;
      onDragStart?.(cardId, { x: startX, y: startY });
      return true;
    }
    return false;
  };

  const forceStart = () => {
    if (!started) {
      started = true;
      onDragStart?.(cardId, { x: startX, y: startY });
    }
  };

  const finish = () => {
    // クリーンアップ処理
  };

  return {
    startX,
    startY,
    element,
    cardId,
    startTime,
    started,
    finish,
    onMove,
    forceStart,
  };
}

/**
 * ドロップ位置の要素を検出
 */
export function getDropTarget(
  x: number,
  y: number,
  refs: {
    enemyHeroRef: React.RefObject<HTMLElement>;
    playerHeroRef: React.RefObject<HTMLElement>;
    playerBattleRef: React.RefObject<HTMLElement>;
    enemyFieldCards: string[]; // uniqueIds
  }
): { type: string; targetId: string | null } | null {
  const dropEl = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!dropEl) return null;

  // 敵ヒーロー判定
  if (refs.enemyHeroRef.current && 
      (refs.enemyHeroRef.current === dropEl || refs.enemyHeroRef.current.contains(dropEl))) {
    return { type: "enemy_hero", targetId: "hero" };
  }

  // 敵フィールドカード判定
  const dropFieldCardEl = dropEl.closest('[data-uniqueid]') as HTMLElement | null;
  const dropFieldCardId = dropFieldCardEl?.getAttribute('data-uniqueid');
  
  if (dropFieldCardId && refs.enemyFieldCards.includes(dropFieldCardId)) {
    return { type: "enemy_field_card", targetId: dropFieldCardId };
  }

  // プレイヤーヒーロー判定
  if (refs.playerHeroRef.current &&
      (refs.playerHeroRef.current === dropEl || refs.playerHeroRef.current.contains(dropEl))) {
    return { type: "player_hero", targetId: "hero" };
  }

  // プレイヤーフィールド判定
  if (refs.playerBattleRef.current &&
      (refs.playerBattleRef.current === dropEl || refs.playerBattleRef.current.contains(dropEl))) {
    return { type: "player_field", targetId: null };
  }

  return null;
}

/**
 * ドラッグギャラリア状態の初期化
 */
export function initDragImage(element: HTMLElement): void {
  try {
    const dragImage = new window.Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    (element as any).setDragImage?.(dragImage, 0, 0);
  } catch (e) {
    // ブラウザが setDragImage をサポートしていない場合
  }
}

/**
 * ドラッグ状態の計算
 */
export function calculateDragPosition(
  baseX: number,
  baseY: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  return {
    x: baseX - offsetX,
    y: baseY - offsetY,
  };
}
