"use client";

import { useEffect, useRef, useState } from "react";
import type { Card } from "../data/cards";
import type { RuntimeCard } from "../types/gameTypes";

interface UseArrowCanvasProps {
  draggingCard: string | null;
  dragPosition: { x: number; y: number };
  playerHandCards: Card[];
  playerFieldCards: RuntimeCard[];
  enemyFieldCards: RuntimeCard[];
  hoverTarget: { type: string | null; id?: string | null };
  arrowStartPos: React.MutableRefObject<{ x: number; y: number } | null>;
  enemyHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  playerHeroRef: React.MutableRefObject<HTMLDivElement | null>;
  playerFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  enemyFieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  attackTargets: string[];
  setAttackTargets: (targets: string[]) => void;
  lastAttackTargetsRef: React.MutableRefObject<string[]>;
}

export function useArrowCanvas({
  draggingCard,
  dragPosition,
  playerHandCards,
  playerFieldCards,
  enemyFieldCards,
  hoverTarget,
  arrowStartPos,
  enemyHeroRef,
  playerHeroRef,
  playerFieldRefs,
  enemyFieldRefs,
  attackTargets,
  setAttackTargets,
  lastAttackTargetsRef,
}: UseArrowCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [arrowProgress, setArrowProgress] = useState<number>(0);

  // Arrow progress animation on hover
  useEffect(() => {
    if (hoverTarget.type && attackTargets.includes(hoverTarget.id || "hero")) {
      setArrowProgress(0);
      const interval = setInterval(() => {
        setArrowProgress((prev) => Math.min(prev + 0.05, 1));
      }, 50);
      return () => clearInterval(interval);
    } else {
      setArrowProgress(0);
    }
  }, [hoverTarget, attackTargets]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const drawArrow = () => {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      if (!draggingCard || !arrowStartPos.current) return;

      const isHandCard = playerHandCards.some((c) => c.uniqueId === draggingCard);
      const draggingCardObj = playerHandCards.find((c) => c.uniqueId === draggingCard) || playerFieldCards.find((c) => c.uniqueId === draggingCard);
      const isHandSpell = isHandCard && draggingCardObj?.type === "spell";
      const isHealSpell = isHandSpell && draggingCardObj?.effect === "heal_single";
      const isHasteSpell = isHandSpell && draggingCardObj?.effect === "haste";
      const isDamageSpell = isHandSpell && !isHealSpell && !isHasteSpell;
      if (isHandCard && !isHandSpell) return;

      const attackingCard = playerFieldCards.find((c) => c.uniqueId === draggingCard && c.canAttack);
      if (!attackingCard && !isHandSpell) return;

      const targets: { x: number; y: number; kind: "damage" | "heal"; id: string }[] = [];

      if (isDamageSpell || attackingCard) {
        const canTargetHero = !(attackingCard as { rushInitialTurn?: boolean })?.rushInitialTurn;
        const hasWallGuardOnEnemy = enemyFieldCards.some((c) => (c as { wallGuard?: boolean }).wallGuard);
        if (canTargetHero && !hasWallGuardOnEnemy && enemyHeroRef.current) {
          const rect = enemyHeroRef.current.getBoundingClientRect();
          targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height, kind: "damage", id: "hero" });
        }
        for (const c of enemyFieldCards) {
          if ((c as { stealth?: boolean }).stealth) continue;
          const ref = enemyFieldRefs.current[c.uniqueId];
          if (ref) {
            const rect = ref.getBoundingClientRect();
            targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "damage", id: c.uniqueId });
          }
        }
      }

      if (isHealSpell) {
        for (const c of playerFieldCards) {
          const ref = playerFieldRefs.current[c.uniqueId];
          if (ref) {
            const rect = ref.getBoundingClientRect();
            targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "heal", id: c.uniqueId });
          }
        }
      }

      if (isHasteSpell) {
        for (const c of playerFieldCards) {
          if (c.canAttack) {
            const ref = playerFieldRefs.current[c.uniqueId];
            if (ref) {
              const rect = ref.getBoundingClientRect();
              targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "heal", id: c.uniqueId });
            }
          }
        }
      }

      // update attackTargets only when changed
      const ids = targets.map((t) => t.id);
      const last = lastAttackTargetsRef.current;
      let changed = last.length !== ids.length;
      if (!changed) {
        for (let i = 0; i < ids.length; i++) {
          if (last[i] !== ids[i]) { changed = true; break; }
        }
      }
      if (changed) {
        lastAttackTargetsRef.current = ids;
        setAttackTargets(ids);
      }

      // find active target
      let target: { x: number; y: number; kind: "damage" | "heal" } | null = null;
      if (hoverTarget.type === "enemyHero" && targets.some((t) => t.id === "hero")) {
        const rect = enemyHeroRef.current?.getBoundingClientRect();
        if (rect) target = { x: rect.left + rect.width / 2, y: rect.top + rect.height, kind: "damage" };
      } else if (hoverTarget.type === "enemyCard" && hoverTarget.id && targets.some((t) => t.id === hoverTarget.id)) {
        const ref = enemyFieldRefs.current[hoverTarget.id];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          target = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "damage" };
        }
      } else if (hoverTarget.type === "playerHero" && targets.some((t) => t.id === "hero")) {
        const rect = playerHeroRef.current?.getBoundingClientRect();
        if (rect) target = { x: rect.left + rect.width / 2, y: rect.top + rect.height, kind: "heal" };
      } else if (hoverTarget.type === "playerCard" && hoverTarget.id && targets.some((t) => t.id === hoverTarget.id)) {
        const ref = playerFieldRefs.current[hoverTarget.id];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          target = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "heal" };
        }
      }

      if (target) {
        const startX = arrowStartPos.current!.x;
        const startY = arrowStartPos.current!.y;
        const endX = target.x;
        const endY = target.y;
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const ratio = Math.min((distance * arrowProgress) / distance, 1);
        const currentEndX = startX + (endX - startX) * ratio;
        const currentEndY = startY + (endY - startY) * ratio;

        ctx2d.lineWidth = 3;
        ctx2d.strokeStyle = target.kind === "heal" ? "#4caf50" : "#ff5722";
        ctx2d.setLineDash([5, 5]);
        ctx2d.lineDashOffset = -arrowProgress * 20;
        ctx2d.beginPath();
        ctx2d.moveTo(startX, startY);
        ctx2d.lineTo(currentEndX, currentEndY);
        ctx2d.stroke();

        if (ratio >= 1) {
          const angle = Math.atan2(endY - startY, endX - startX);
          const arrowLength = 10;
          ctx2d.beginPath();
          ctx2d.moveTo(currentEndX, currentEndY);
          ctx2d.lineTo(currentEndX - arrowLength * Math.cos(angle - Math.PI / 6), currentEndY - arrowLength * Math.sin(angle - Math.PI / 6));
          ctx2d.moveTo(currentEndX, currentEndY);
          ctx2d.lineTo(currentEndX - arrowLength * Math.cos(angle + Math.PI / 6), currentEndY - arrowLength * Math.sin(angle + Math.PI / 6));
          ctx2d.stroke();
        }
      }
    };

    let rafId: number;
    const tick = () => {
      drawArrow();
      rafId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [draggingCard, dragPosition, playerFieldCards, playerHandCards, enemyFieldCards, arrowProgress, hoverTarget, arrowStartPos, enemyHeroRef, playerHeroRef, playerFieldRefs, enemyFieldRefs, lastAttackTargetsRef, setAttackTargets]);

  return { canvasRef, arrowProgress, setArrowProgress };
}
