// CardItem.tsx
"use client";
import React from "react";
import Image from "next/image";
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
  poison?: number;
  frozen?: number;
  haste?: boolean;
  rush?: boolean;
  superHaste?: boolean;
  stealth?: boolean;
  canAttack?: boolean;
  rushInitialTurn?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  isTarget?: boolean;
  inHand?: boolean;
  currentMana?: number;
  style?: React.CSSProperties;
  className?: string;
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
  poison,
  frozen,
  haste,
  rush,
  superHaste,
  stealth,
  canAttack,
  rushInitialTurn,
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
  className,
  selected,
  noStatus,
  onMouseEnter,
  onMouseLeave,
}, ref) => {
  let borderColor = "gray";
  let borderWidth = 2;
  // 選択フラグがある場合は最優先で緑枠（太線）にする
  if (selected) {
    borderColor = "limegreen";
    borderWidth = 2;
  } else if (noStatus) {
    // マリガンやプレビュー用など、カードの手札ステータスを反映したくない場合
    borderColor = "gray";
  } else {
    if (inHand && currentMana !== undefined && cost !== undefined) {
      borderColor = currentMana >= cost ? "gold" : "gray";
    } else if (canAttack !== undefined) {
      // superHaste は常に緑枠（出したターンから攻撃可能）
      if (superHaste && canAttack) {
        borderColor = "green";
      }
      // 突進（rush）で出したばかり（rushInitialTurn = true）なら黄色枠
      else if (rush && rushInitialTurn && canAttack) {
        borderColor = "yellow";
      }
      // それ以外の攻撃可能状態は通常の緑枠
      else {
        borderColor = canAttack ? "green" : "red";
      }
    }
    if (isTarget) {
      borderColor = "limegreen";
      borderWidth = 2;
    }
  }

  const hpClass = getCardHpClass(hp, maxHp);

  return (
    <div
      className={`${styles.card} ${!inHand ? styles.card_on_field : ''} ${className || ""}`}
      data-uniqueid={uniqueId}
      data-type={type}
      aria-label={name}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        touchAction: (draggable || inHand) ? 'none' : undefined,
        ...style,
        border: `${borderWidth}px solid ${borderColor}`,
      }}
      ref={ref} // forwardRef により渡せるようになる
    >
      {image && <Image src={image} alt={name} width={100} height={100} priority />}
      {/* 状態バッジ */}
      {!noStatus && (
        <div style={{ position: "absolute", left: 8, top: 8, display: "flex", gap: 6, zIndex: 20 }} aria-hidden={false}>
          {typeof frozen === "number" && frozen > 0 && (
            <div title={`凍結: ${frozen}ターン`} aria-label={`凍結 ${frozen}ターン`} style={{ background: "#4fc3f7", color: "#003", padding: "2px 6px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              凍{frozen}
            </div>
          )}
          {typeof poison === "number" && poison > 0 && (
            <div title={`毒: ${poison}ターン`} aria-label={`毒 ${poison}ターン`} style={{ background: "#e57373", color: "#300", padding: "2px 6px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              毒{poison}
            </div>
          )}
          {haste && (
            <div title={`加速`} aria-label={`加速`} style={{ background: "#ffd54f", color: "#663c00", padding: "2px 6px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              速
            </div>
          )}
          {stealth && (
            <div title={`隠密`} aria-label={`隠密`} style={{ background: "#9e9e9e", color: "#fff", padding: "2px 6px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              隠
            </div>
          )}
        </div>
      )}
      {cost !== undefined && (
        <div className={styles.card_cost}>
          <p>{cost}</p>
        </div>
      )}

       {/* follower のときだけ stats を表示 */}
      {type === "follower" && (
          <>
            <div className={`${styles.card_hp} ${hpClass}`}>
              <p>{Math.min(hp, maxHp)}</p>
            </div>

            <div className={styles.card_attack}>
              <p>{attack ?? 0}</p>
            </div>
          </>
        )}
        
      {/* <div>{name}</div> */}
    </div>
  );
});

export default CardItem;
