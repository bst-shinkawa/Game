"use client";

import React, { useContext, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CardItem from "./CardItem";
import { CoinToss3D } from "./CoinToss3D";
import type { Card } from "@/app/data/cards";
import styles from "@/app/assets/css/Game.Master.module.css";
import cardBack from "@/public/img/field/card_back.png";
import ViewportContext from "@/app/context/ViewportContext";

/** ViewportScaler 内の設計座標系（.card と同じ 100×(250/180) の飛び物サイズ） */
const MULLIGAN_FLIGHT_W = 100;
const MULLIGAN_FLIGHT_H = (MULLIGAN_FLIGHT_W * 250) / 180;

/** drawFlights の motion と transition duration/delay を共有（タイムアウトとズラさない） */
const MULLIGAN_DRAW_DURATION_SEC = 0.5;
const MULLIGAN_DRAW_STAGGER_SEC = 0.08;

interface PreGameProps {
  coinResult: "deciding" | "player" | "enemy";
  showCoinPopup: boolean;
  rouletteRunning: boolean;
  rouletteLabel: string;
  playerHandCards: Card[];
  currentMana: number;
  mulliganTimer: number;
  swapIds: string[];
  descCardId: string | null;
  // Handlers
  onRouletteAnimEnd: () => void;
  onSwapToggle: (cardId: string) => void;
  onMulliganSubmit: () => void;
  onMulliganSkip: () => void;
  onPreGameCardHover: (cardId: string | null) => void;
  setRouletteRunning: (running: boolean) => void;
  setSwapIds: (ids: string[]) => void;
}

export const PreGame: React.FC<PreGameProps> = ({
  coinResult,
  showCoinPopup,
  rouletteRunning,
  rouletteLabel,
  playerHandCards,
  currentMana,
  mulliganTimer,
  swapIds,
  descCardId,
  onRouletteAnimEnd,
  onSwapToggle,
  onMulliganSubmit,
  onMulliganSkip,
  onPreGameCardHover,
  setRouletteRunning,
  setSwapIds,
}) => {
  const viewport = useContext(ViewportContext);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivatedRef = useRef<string | null>(null);
  const mulliganCardAreaRef = useRef<HTMLDivElement | null>(null);
  const mulliganDeckRef = useRef<HTMLDivElement | null>(null);
  const prevHandIdsRef = useRef<string[]>([]);
  const prevCardsRef = useRef<Record<string, Card>>({});
  const prevRectsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [incomingIds, setIncomingIds] = React.useState<Set<string>>(new Set());
  const [drawFlights, setDrawFlights] = React.useState<Array<{
    id: string;
    card: Card;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    delay: number;
  }>>([]);
  const [returnFlights, setReturnFlights] = React.useState<Array<{
    id: string;
    card: Card;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    delay: number;
  }>>([]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (cardId: string) => {
    clearLongPressTimer();
    longPressActivatedRef.current = null;
    longPressTimerRef.current = setTimeout(() => {
      longPressActivatedRef.current = cardId;
      onPreGameCardHover(cardId);
    }, 350);
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
  };

  const handleCardTap = (cardId: string) => {
    if (longPressActivatedRef.current === cardId) {
      longPressActivatedRef.current = null;
      return;
    }
    onSwapToggle(cardId);
  };

  // ルーレット開始（プリゲーム開始時に初回実行）
  useEffect(() => {
    if (coinResult === "deciding" && !rouletteRunning) {
      setRouletteRunning(true);
    }
  }, [coinResult, rouletteRunning, setRouletteRunning]);

  useEffect(() => {
    if (coinResult === "deciding" || showCoinPopup) return;
    const s = Math.max(viewport.scale, 0.01);
    const { containerLeft, containerTop } = viewport;
    const nodes = mulliganCardAreaRef.current?.querySelectorAll("[data-pre-card-id]") ?? [];
    const nextRects: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node) => {
      const el = node as HTMLElement;
      const id = el.dataset.preCardId;
      if (!id) return;
      const rect = el.getBoundingClientRect();
      nextRects[id] = {
        x: (rect.left - containerLeft) / s,
        y: (rect.top - containerTop) / s,
      };
    });
    prevRectsRef.current = nextRects;
  }, [playerHandCards, coinResult, showCoinPopup, viewport.scale, viewport.containerLeft, viewport.containerTop]);

  useEffect(() => {
    if (coinResult === "deciding" || showCoinPopup) return;

    const s = Math.max(viewport.scale, 0.01);
    const { containerLeft, containerTop } = viewport;
    const toDesign = (cx: number, cy: number) => ({
      x: (cx - containerLeft) / s,
      y: (cy - containerTop) / s,
    });

    const currentIds = playerHandCards.map((c) => c.uniqueId);
    const prevIds = prevHandIdsRef.current;
    const deckRect = mulliganDeckRef.current?.getBoundingClientRect();
    if (!deckRect) {
      prevHandIdsRef.current = currentIds;
      prevCardsRef.current = Object.fromEntries(playerHandCards.map((c) => [c.uniqueId, c]));
      return;
    }

    const deckCenter = toDesign(
      deckRect.left + deckRect.width / 2,
      deckRect.top + deckRect.height / 2,
    );
    const fromCentered = {
      x: deckCenter.x - MULLIGAN_FLIGHT_W / 2,
      y: deckCenter.y - MULLIGAN_FLIGHT_H / 2,
    };

    const added = playerHandCards.filter((c) => !prevIds.includes(c.uniqueId));
    const removedIds = prevIds.filter((id) => !currentIds.includes(id));

    const nextDrawFlights = added
      .map((card, i) => {
        const targetEl = mulliganCardAreaRef.current?.querySelector(`[data-pre-card-id="${card.uniqueId}"]`) as HTMLElement | null;
        if (!targetEl) return null;
        const targetRect = targetEl.getBoundingClientRect();
        const to = toDesign(targetRect.left, targetRect.top);
        return {
          id: card.uniqueId,
          card,
          fromX: fromCentered.x,
          fromY: fromCentered.y,
          toX: to.x,
          toY: to.y,
          delay: i * MULLIGAN_DRAW_STAGGER_SEC,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    const nextReturnFlights = removedIds
      .map((id, i) => {
        const pos = prevRectsRef.current[id];
        const card = prevCardsRef.current[id];
        if (!pos || !card) return null;
        return {
          id: `return-${id}-${Date.now()}`,
          card,
          fromX: pos.x,
          fromY: pos.y,
          toX: fromCentered.x,
          toY: fromCentered.y,
          delay: i * 0.06,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (nextDrawFlights.length > 0) {
      const ids = nextDrawFlights.map((f) => f.id);
      setIncomingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setDrawFlights((prev) => [...prev, ...nextDrawFlights]);
      // 着弾は各 motion の onAnimationComplete に同期。固定 ms タイムアウトは使わない。
    }

    if (nextReturnFlights.length > 0) {
      setReturnFlights((prev) => [...prev, ...nextReturnFlights]);
      nextReturnFlights.forEach((flight, index) => {
        window.setTimeout(() => {
          setReturnFlights((prev) => prev.filter((f) => f.id !== flight.id));
        }, 460 + index * 60);
      });
    }

    prevHandIdsRef.current = currentIds;
    prevCardsRef.current = Object.fromEntries(playerHandCards.map((c) => [c.uniqueId, c]));
  }, [playerHandCards, coinResult, showCoinPopup, viewport.scale, viewport.containerLeft, viewport.containerTop]);

  // ルーレット演出：coinResult が "deciding" のみ表示
  if (coinResult === "deciding") {
    return (
      <div style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0, zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "rgba(0,0,0,0.85)", color: "#fff", padding: 30, borderRadius: 8, textAlign: "center" }}>
          <h3 style={{ marginTop: 0 }}>先攻/後攻をコイントスで決定中...</h3>
          <p style={{ margin: "8px 0 0", opacity: 0.85, fontSize: 14 }}>
            {rouletteRunning ? "コインを投げています..." : `結果: ${rouletteLabel === "player" ? "プレイヤー" : "敵"}`}
          </p>
          <div style={{ marginTop: 12 }}>
            <CoinToss3D
              running={rouletteRunning}
              onComplete={onRouletteAnimEnd}
              width={320}
              height={210}
              result={rouletteLabel === "enemy" ? "enemy" : "player"}
            />
          </div>
        </div>
      </div>
    );
  }

  // coinResult が決定済みかつ coinPopup 表示中：コイン結果を表示
  if (showCoinPopup) {
    return (
      <div className={styles.coinPopup} role="alert" aria-live="polite">
        <div className={styles.coinPopupInner}>
          <div className={styles.coinPopupWinner}>{coinResult === 'player' ? 'あなたは先攻' : 'あなたは後攻'}</div>
        </div>
      </div>
    );
  }

  // coinResult が決定済みかつ coinPopup が非表示：マリガン画面を表示
  const descCard = descCardId ? playerHandCards.find((c) => c.uniqueId === descCardId) : null;
  return (
    <div className={styles.mulligan}>
      <div className={styles.mulligan_wrap}>
        <h3 className={styles.mulligan_trun}>{coinResult === 'player' ? 'あなたは先攻' : 'あなたは後攻'}</h3>
        <p className={styles.mulligan_text}><span className={styles.mulligan_largeText}>交換したいカードを選択してください</span><br></br>（選択後は「交換」を押してください）</p>
        <p>制限時間:<span className={styles.mulligan_time}> {mulliganTimer} </span>s</p>

        <div className={styles.mulligan_card} ref={mulliganCardAreaRef}>
          {playerHandCards.map((c) => {
            const marked = swapIds.includes(c.uniqueId);
            return (
              <div
                key={c.uniqueId}
                data-pre-card-id={c.uniqueId}
                style={{
                  padding: 6,
                  opacity: incomingIds.has(c.uniqueId) ? 0 : 1,
                  transition: "opacity 0.2s ease-out",
                }}
              >
                <CardItem
                  {...c}
                  hp={c.hp ?? 0}
                  maxHp={c.maxHp ?? 0}
                  attack={c.attack ?? 0}
                  inHand
                  currentMana={0}
                  selected={marked}
                  noStatus={true}
                  onClick={() => handleCardTap(c.uniqueId)}
                  onMouseEnter={() => onPreGameCardHover(c.uniqueId)}
                  onMouseLeave={() => onPreGameCardHover(null)}
                  onTouchStart={() => handleTouchStart(c.uniqueId)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                />
              </div>
            );
          })}
        </div>
        <div className={styles.mulligan_deck_pile} ref={mulliganDeckRef} aria-hidden={true}>
          <div className={styles.mulligan_deck_pile_layer_1} style={{ backgroundImage: `url(${cardBack.src})` }} />
          <div className={styles.mulligan_deck_pile_layer_2} style={{ backgroundImage: `url(${cardBack.src})` }} />
          <div className={styles.mulligan_deck_pile_layer_3} style={{ backgroundImage: `url(${cardBack.src})` }} />
        </div>

        <AnimatePresence>
          {drawFlights.map((flight) => (
            <motion.div
              key={`pre-draw-${flight.id}`}
              className={styles.preGameFlight}
              initial={{ x: flight.fromX, y: flight.fromY, scale: 0.76, rotate: -12, opacity: 0.98 }}
              animate={{ x: flight.toX, y: flight.toY, scale: 1, rotate: 0, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
              transition={{ duration: MULLIGAN_DRAW_DURATION_SEC, delay: flight.delay, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => {
                setIncomingIds((prev) => {
                  if (!prev.has(flight.id)) return prev;
                  const next = new Set(prev);
                  next.delete(flight.id);
                  return next;
                });
                setDrawFlights((prev) => prev.filter((f) => f.id !== flight.id));
              }}
            >
              <div className={styles.card}>
                {flight.card.image ? <img src={flight.card.image} alt={flight.card.name} style={{ width: "100%", height: "100%", borderRadius: 10 }} /> : null}
              </div>
            </motion.div>
          ))}
          {returnFlights.map((flight) => (
            <motion.div
              key={`pre-return-${flight.id}`}
              className={styles.preGameFlight}
              initial={{ x: flight.fromX, y: flight.fromY, scale: 1, rotate: 0, opacity: 1 }}
              animate={{ x: flight.toX, y: flight.toY, scale: 0.78, rotate: 10, opacity: 0.96 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.38, delay: flight.delay, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.card}>
                {flight.card.image ? <img src={flight.card.image} alt={flight.card.name} style={{ width: "100%", height: "100%", borderRadius: 10 }} /> : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {descCard && (
          <div className={styles.field_card_description} aria-hidden={false} data-card-description="true">
            <h4>{descCard.name}</h4>
            <p>{descCard.description ?? ""}</p>
            {descCard.descriptionFormationBonus ? (
              <p className={styles.field_card_description_synergy}>
                <span className={styles.field_card_description_synergy_label_formation}>陣形</span>
                <br />
                {descCard.descriptionFormationBonus}
              </p>
            ) : null}
            {descCard.descriptionDaggerSynergy ? (
              <p className={styles.field_card_description_synergy}>
                <span className={styles.field_card_description_synergy_label_dagger}>暗器</span>
                <br />
                {descCard.descriptionDaggerSynergy}
              </p>
            ) : null}
          </div>
        )}

        <div className={styles.mulligan_btn}>
          <button className={styles.mulligan_btn_item} onClick={onMulliganSubmit}>交換する</button>
          <button className={styles.mulligan_btn_item} onClick={onMulliganSkip}>交換しない</button>
        </div>
      </div>
    </div>
  );
};
