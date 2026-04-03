"use client";

import React, { useEffect, useState, useRef } from "react";
import CardItem from "./CardItem";
import type { CardRevealState } from "@/app/types/gameTypes";
import styles from "@/app/assets/css/Game.Master.module.css";

interface EnemyCardRevealProps {
  reveal: CardRevealState;
  onComplete: () => void;
  playerHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  enemyHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  playerFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  enemyFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
}

type Phase = "enter" | "hold" | "fly" | "done";

const ENTER_MS = 300;
const HOLD_MS = 600;
const FLY_MS = 450;

const EnemyCardReveal: React.FC<EnemyCardRevealProps> = ({
  reveal,
  onComplete,
  playerHeroRef,
  enemyHeroRef,
  playerFieldRefs,
  enemyFieldRefs,
}) => {
  const [phase, setPhase] = useState<Phase>("enter");
  const [flyTarget, setFlyTarget] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);

  const resolveTargetPos = (): { x: number; y: number } | null => {
    const tid = reveal.targetId;
    if (!tid) return null;

    let el: HTMLElement | null = null;
    if (tid === "hero") {
      el = playerHeroRef.current;
    } else {
      el = playerFieldRefs.current[tid] ?? enemyFieldRefs.current[tid] ?? null;
    }
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  useEffect(() => {
    completedRef.current = false;

    const t1 = setTimeout(() => setPhase("hold"), ENTER_MS);
    const t2 = setTimeout(() => {
      if (reveal.type === "spell" && reveal.targetId) {
        const pos = resolveTargetPos();
        if (pos) setFlyTarget(pos);
        setPhase("fly");
      } else {
        setPhase("fly");
      }
    }, ENTER_MS + HOLD_MS);
    const t3 = setTimeout(() => {
      setPhase("done");
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, ENTER_MS + HOLD_MS + FLY_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [reveal]);

  if (phase === "done") return null;

  const isSpellWithTarget = reveal.type === "spell" && reveal.targetId && flyTarget;

  const cardStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      position: "fixed",
      zIndex: 2500,
      pointerEvents: "none",
      width: 120,
      height: 170,
      transition: `transform ${FLY_MS}ms cubic-bezier(.4,.0,.2,1), opacity ${FLY_MS}ms ease`,
    };

    if (phase === "enter") {
      return {
        ...base,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) scale(0.3)",
        opacity: 0,
      };
    }

    if (phase === "hold") {
      return {
        ...base,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) scale(1)",
        opacity: 1,
        transition: `transform ${ENTER_MS}ms cubic-bezier(.2,1,.3,1), opacity ${ENTER_MS}ms ease`,
      };
    }

    if (phase === "fly") {
      if (isSpellWithTarget) {
        return {
          ...base,
          left: flyTarget.x,
          top: flyTarget.y,
          transform: "translate(-50%, -50%) scale(0.25)",
          opacity: 0,
        };
      }
      if (reveal.type === "follower") {
        return {
          ...base,
          left: "50%",
          top: "20%",
          transform: "translate(-50%, -50%) scale(0.5)",
          opacity: 0,
        };
      }
      return {
        ...base,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) scale(0.6)",
        opacity: 0,
      };
    }

    return base;
  })();

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    left: 0, top: 0, right: 0, bottom: 0,
    zIndex: 2400,
    pointerEvents: "none",
    background: phase === "hold" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
    transition: `background ${phase === "hold" ? ENTER_MS : FLY_MS}ms ease`,
  };

  const { card } = reveal;

  return (
    <>
      <div style={overlayStyle} />
      <div ref={cardRef} style={cardStyle} className={styles.card_reveal_wrapper}>
        <CardItem
          uniqueId={card.uniqueId}
          name={card.name}
          type={card.type}
          hp={card.hp ?? 0}
          maxHp={card.hp ?? 0}
          attack={card.attack ?? 0}
          cost={card.cost}
          image={card.image}
          noStatus
          style={{ width: "100%", height: "100%", paddingTop: 0 }}
        />
        {phase === "hold" && (
          <div className={styles.card_reveal_name}>
            {card.name}
          </div>
        )}
      </div>
      {phase === "hold" && isSpellWithTarget && (
        <div className={styles.card_reveal_trail} />
      )}
    </>
  );
};

export default EnemyCardReveal;
