// CardItem.tsx
"use client";
import React from "react";
import styles from "../assets/css/Game.Master.module.css";
import { CardType } from "../data/cards";

type Props = {
  uniqueId: string;
  name: string;
  type: CardType;
  hp?: number;
  maxHp?: number;
  attack?: number;
  cost?: number;
  image?: string;
  canAttack?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  isTarget?: boolean;
  inHand?: boolean;
  currentMana?: number;
  style?: React.CSSProperties;
  selected?: boolean;
  noStatus?: boolean;
};

// Small helper: pick a CSS class for HP color
const getCardHpClass = (hp: number, maxHp: number) => {
  return hp >= maxHp ? styles.hpWhite : styles.hpRed;
};

/**
 * CardItem
 * --------
 * カードを表示する汎用コンポーネントです。props によっていくつかの表示モードをサポートします：
 * - inHand/currentMana: 手札表示時にマナでハイライトする用途
 * - selected: マリガンなどで選択中を示す緑枠表示
 * - noStatus: プレビュー／マリガンのように手札の状態を反映したくない場合に使用
 *
 * このコンポーネントはゲーム状態を直接変更しない設計です。onClick や onDrag* といった
 * コールバックを親から受け取り、それを通じて UI イベントを伝搬します。
 */

const CardItem = React.forwardRef<HTMLDivElement, Props>(({
  uniqueId,
  name,
  type,
  hp = 0,
  maxHp = 20,
  attack,
  cost,
  image,
  canAttack,
  draggable,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isTarget,
  inHand,
  currentMana,
  style,
  selected,
  noStatus,
}, ref) => {
  let borderColor = "gray";
  let borderWidth = 2;
  // 選択フラグがある場合は最優先で緑枠（太線）にする
  if (selected) {
    borderColor = "limegreen";
    borderWidth = 3;
  } else if (noStatus) {
    // マリガンやプレビュー用など、カードの手札ステータスを反映したくない場合
    borderColor = "gray";
  } else {
    if (inHand && currentMana !== undefined && cost !== undefined) {
      borderColor = currentMana >= cost ? "gold" : "gray";
    } else if (canAttack !== undefined) {
      borderColor = canAttack ? "green" : "red";
    }
    if (isTarget) {
      borderColor = "limegreen";
      borderWidth = 3;
    }
  }

  const hpClass = getCardHpClass(hp, maxHp);

  return (
    <div
      className={styles.card}
      data-uniqueid={uniqueId}
      data-type={type}
      aria-label={name}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        ...style,
        border: `${borderWidth}px solid ${borderColor}`,
      }}
      ref={ref} // forwardRef により渡せるようになる
    >
      {image && <img src={image} alt={name} />}
      {cost !== undefined && (
        <div className={styles.card_cost}>
          <p>{cost}</p>
        </div>
      )}
      <div className={`${styles.card_hp} ${hpClass}`}>
        <p>{Math.min(hp, maxHp)}</p>
      </div>
      <div className={styles.card_attack}>
        <p>{attack ?? 0}</p>
      </div>
      {/* <div>{name}</div> */}
    </div>
  );
});

export default CardItem;
