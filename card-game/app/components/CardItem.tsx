// CardItem.tsx
"use client";
import React, { useRef, useEffect } from "react";
import styles from "../assets/css/Game.Master.module.css";
import { CardType } from "../data/cards";

type Props = {
  uniqueId: string;
  name: string;
  type: CardType;
  hp?: number;
  attack?: number;
  image?: string;
  draggingCard?: string | null;
  setDraggingCard?: (id: string | null) => void;
  setDragPosition?: (pos: { x: number; y: number }) => void;
  style?: React.CSSProperties;
};

const CardItem: React.FC<Props> = ({
  uniqueId,
  name,
  type,
  hp,
  attack,
  image,
  draggingCard,
  setDraggingCard,
  setDragPosition,
  style,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingCard?.(uniqueId);
    setDragPosition?.({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingCard === uniqueId) {
        setDragPosition?.({ x: e.clientX, y: e.clientY });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [draggingCard, uniqueId, setDragPosition]);

  const cardStyle: React.CSSProperties =
    draggingCard === uniqueId
      ? {
          position: "fixed",
          left: style?.left ?? 0,
          top: style?.top ?? 0,
          zIndex: 9999,
          pointerEvents: "none",
        }
      : {};

  return (
    <div
      ref={cardRef}
      className={styles.card}
      data-type={type}
      aria-label={name}
      onMouseDown={handleMouseDown}
      style={{ ...cardStyle, ...style }}
    >
      {image && <img src={image} alt={name} />}
      <div className={styles.card_hp}>
        <p>{hp ?? 0}</p>
      </div>
      <div className={styles.card_attack}>
        <p>{attack ?? 0}</p>
      </div>
    </div>
  );
};

export default CardItem;
