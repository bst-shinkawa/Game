"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
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

type Segment = "pop" | "hold" | "fly" | "done";

const ENTER_MS = 300;
const HOLD_MS = 600;
const FLY_MS = 450;

const cardFixed: React.CSSProperties = {
  position: "fixed",
  zIndex: 2500,
  pointerEvents: "none",
  width: 120,
  height: 170,
};

const EnemyCardReveal: React.FC<EnemyCardRevealProps> = ({
  reveal,
  onComplete,
  playerHeroRef,
  enemyHeroRef: _enemyHeroRef,
  playerFieldRefs,
  enemyFieldRefs,
}) => {
  void _enemyHeroRef;
  const [segment, setSegment] = useState<Segment>("pop");
  const [flyTarget, setFlyTarget] = useState<{ x: number; y: number } | null>(null);
  const completedRef = useRef(false);
  const popDoneRef = useRef(false);
  const flyDoneRef = useRef(false);
  const segmentRef = useRef<Segment>(segment);
  segmentRef.current = segment;

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
    setSegment("pop");
    setFlyTarget(null);
    completedRef.current = false;
    popDoneRef.current = false;
    flyDoneRef.current = false;
  }, [reveal.card.uniqueId, reveal.type, reveal.targetId]);

  useEffect(() => {
    if (segment !== "hold") return;
    const t = window.setTimeout(() => {
      if (reveal.type === "spell" && reveal.targetId) {
        setFlyTarget(resolveTargetPos());
      } else {
        setFlyTarget(null);
      }
      setSegment("fly");
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [segment, reveal.type, reveal.targetId]);

  const handlePopComplete = () => {
    if (segmentRef.current !== "pop" || popDoneRef.current) return;
    popDoneRef.current = true;
    setSegment("hold");
  };

  const handleFlyComplete = () => {
    if (segmentRef.current !== "fly" || flyDoneRef.current) return;
    flyDoneRef.current = true;
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
    setSegment("done");
  };

  if (segment === "done") return null;

  const isSpellWithTarget =
    reveal.type === "spell" && reveal.targetId && flyTarget != null;

  const flyTransition = { duration: FLY_MS / 1000, ease: [0.4, 0, 0.2, 1] as const };

  const flyAnimate =
    segment === "fly"
      ? isSpellWithTarget
        ? {
            left: flyTarget!.x,
            top: flyTarget!.y,
            x: "-50%",
            y: "-50%",
            scale: 0.25,
            opacity: 0,
            transition: flyTransition,
          }
        : reveal.type === "follower"
          ? {
              left: "50%",
              top: "20%",
              x: "-50%",
              y: "-50%",
              scale: 0.5,
              opacity: 0,
              transition: flyTransition,
            }
          : {
              left: "50%",
              top: "50%",
              x: "-50%",
              y: "-50%",
              scale: 0.6,
              opacity: 0,
              transition: flyTransition,
            }
      : undefined;

  const { card } = reveal;

  return (
    <>
      <motion.div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2400,
          pointerEvents: "none",
        }}
        initial={{ backgroundColor: "rgba(0,0,0,0)" }}
        animate={
          segment === "pop"
            ? {
                backgroundColor: "rgba(0,0,0,0.35)",
                transition: {
                  delay: ENTER_MS / 1000,
                  duration: ENTER_MS / 1000,
                  ease: "easeOut",
                },
              }
            : segment === "hold"
              ? { backgroundColor: "rgba(0,0,0,0.35)" }
              : {
                  backgroundColor: "rgba(0,0,0,0)",
                  transition: { duration: FLY_MS / 1000, ease: "easeOut" },
                }
        }
      />
      <motion.div
        className={styles.card_reveal_wrapper}
        style={cardFixed}
        initial={{
          left: "50%",
          top: "50%",
          x: "-50%",
          y: "-50%",
          scale: 0.3,
          opacity: 0,
        }}
        animate={
          segment === "pop"
            ? {
                scale: 1,
                opacity: 1,
                transition: {
                  delay: ENTER_MS / 1000,
                  duration: ENTER_MS / 1000,
                  ease: [0.2, 1, 0.3, 1],
                },
              }
            : segment === "hold"
              ? { scale: 1, opacity: 1 }
              : flyAnimate ?? { scale: 1, opacity: 1 }
        }
        onAnimationComplete={() => {
          if (segmentRef.current === "pop") handlePopComplete();
          else if (segmentRef.current === "fly") handleFlyComplete();
        }}
      >
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
        {segment === "hold" && (
          <div className={styles.card_reveal_name}>{card.name}</div>
        )}
      </motion.div>
      {segment === "hold" && isSpellWithTarget && (
        <div className={styles.card_reveal_trail} />
      )}
    </>
  );
};

export default EnemyCardReveal;
