"use client";

import React, { useEffect, useRef } from "react";
import { DamageFloater } from "./DamageFloater";
import { EnemyArea } from "./EnemyArea";
import { PlayerArea } from "./PlayerArea";
import { PreGame } from "./PreGame";
import GameOver from "./GameOver";
import type { Card } from "@/app/data/cards";
import type { DamageFloat } from "@/app/hooks/useGameUI";
import styles from "@/app/assets/css/Game.Master.module.css";

interface GameFieldProps {
  // ゲームロジック
  playerHandCards: Card[];
  playerFieldCards: (Card & { maxHp: number; canAttack?: boolean })[];
  playerHeroHp: number;
  enemyHandCards: Card[];
  enemyFieldCards: (Card & { maxHp: number; canAttack?: boolean })[];
  enemyHeroHp: number;
  playerGraveyard: Card[];
  enemyGraveyard: Card[];
  deck: Card[];
  enemyDeck: Card[];
  currentMana: number;
  enemyCurrentMana: number;
  turn: number;
  turnSecondsRemaining: number;
  gameOver: { over: boolean; winner: null | "player" | "enemy" };
  preGame: boolean;
  coinResult: "deciding" | "player" | "enemy";
  aiRunning: boolean;

  // UI状態
  damageFloats: DamageFloat[];
  draggingCard: string | null;
  dragPosition: { x: number; y: number };
  isHandExpanded: boolean;
  activeHandCardId: string | null;
  showTurnModal: boolean;
  descCardId: string | null;
  rouletteRunning: boolean;
  rouletteLabel: string;
  showCoinPopup: boolean;
  mulliganTimer: number;
  swapIds: string[];
  showGameStart: boolean;
  attackClone: any;
  movingAttack: { attackerId: string; targetId: string | "hero" } | null;
  enemyAttackAnimation: { sourceCardId: string | null; targetId: string | "hero" } | null;
  enemySpellAnimation: { targetId: string | "hero"; effect: string } | null;

  // ゲーム操作
  playCardToField: (card: Card) => void;
  endTurn: () => void;
  attack: (attackerId: string, targetId: string | "hero", isPlayerAttacker?: boolean) => void;
  castSpell: (cardUniqueId: string, targetId: string | "hero", isPlayer?: boolean) => void;
  resetGame: (mode: "cpu" | "pvp") => void;
  finalizeCoin: (winner: "player" | "enemy") => void;
  doMulligan: (keepIds: string[]) => void;
  startMatch: () => void;

  // UI更新関数
  setDamageFloats: (floats: DamageFloat[]) => void;
  setDraggingCard: (id: string | null) => void;
  setDragPosition: (pos: { x: number; y: number }) => void;
  setArrowStartPos: (pos: { x: number; y: number } | null) => void;
  setIsHandExpanded: (expanded: boolean) => void;
  setActiveHandCardId: (id: string | null) => void;
  setShowTurnModal: (show: boolean) => void;
  setDescCardId: (id: string | null) => void;
  setRouletteRunning: (running: boolean) => void;
  setRouletteLabel: (label: string) => void;
  setShowCoinPopup: (show: boolean) => void;
  setMulliganTimer: (timer: number) => void;
  setSwapIds: (ids: string[]) => void;
  setShowGameStart: (show: boolean) => void;
  setAttackClone: (clone: any) => void;

  // Refs
  playerBattleRef: React.MutableRefObject<HTMLDivElement | null>;
  handAreaRef: React.MutableRefObject<HTMLDivElement | null>;
  collapseHand: () => void;
}

export const GameField: React.FC<GameFieldProps> = ({
  // ゲームロジック
  playerHandCards,
  playerFieldCards,
  playerHeroHp,
  enemyHandCards,
  enemyFieldCards,
  enemyHeroHp,
  playerGraveyard,
  enemyGraveyard,
  deck,
  enemyDeck,
  currentMana,
  enemyCurrentMana,
  turn,
  turnSecondsRemaining,
  gameOver,
  preGame,
  coinResult,
  aiRunning,
  // UI状態
  damageFloats,
  draggingCard,
  dragPosition,
  isHandExpanded,
  activeHandCardId,
  showTurnModal,
  descCardId,
  rouletteRunning,
  rouletteLabel,
  showCoinPopup,
  mulliganTimer,
  swapIds,
  showGameStart,
  attackClone,
  movingAttack,
  enemyAttackAnimation,
  enemySpellAnimation,
  // ゲーム操作
  playCardToField,
  endTurn,
  attack,
  castSpell,
  resetGame,
  finalizeCoin,
  doMulligan,
  startMatch,
  // UI更新関数
  setDamageFloats,
  setDraggingCard,
  setDragPosition,
  setArrowStartPos,
  setIsHandExpanded,
  setActiveHandCardId,
  setShowTurnModal,
  setDescCardId,
  setRouletteRunning,
  setRouletteLabel,
  setShowCoinPopup,
  setMulliganTimer,
  setSwapIds,
  setShowGameStart,
  setAttackClone,
  // Refs
  playerBattleRef,
  handAreaRef,
  collapseHand,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enemyHeroRef = useRef<HTMLDivElement | null>(null);
  const enemyFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const playerHeroRef = useRef<HTMLDivElement | null>(null);
  const playerFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const arrowStartPos = useRef<{ x: number; y: number } | null>(null);

  const isPlayerTurn = turn % 2 === 1;
  const MAX_TIME = 60;

  // ドラッグ中のマウス座標追跡
  useEffect(() => {
    if (!draggingCard) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [draggingCard, setDragPosition]);

  // ターン切替時に中央モーダルを短時間表示する
  useEffect(() => {
    if (preGame || showGameStart) {
      setShowTurnModal(false);
      return;
    }
    setShowTurnModal(true);
    const duration = isPlayerTurn ? 2000 : 1200;
    const t = setTimeout(() => setShowTurnModal(false), duration);
    return () => clearTimeout(t);
  }, [isPlayerTurn, turn, preGame, showGameStart, setShowTurnModal]);

  // ダメージフロート表示ロジック: ヒーローとフィールドカードのHP変化を監視してフロートを追加
  const prevPlayerHeroHp = useRef<number>(playerHeroHp);
  const prevEnemyHeroHp = useRef<number>(enemyHeroHp);
  const prevFieldHp = useRef<{ [id: string]: number }>({});

  useEffect(() => {
    // ヒーローダメージ
    if (playerHeroHp < prevPlayerHeroHp.current && playerHeroRef.current) {
      const rect = playerHeroRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const amount = prevPlayerHeroHp.current - playerHeroHp;
      setDamageFloats([...damageFloats, { id: `playerHero-${Date.now()}`, target: 'playerHero', amount, x, y }]);
    }
    if (enemyHeroRef.current && enemyHeroHp < prevEnemyHeroHp.current) {
      const rect = enemyHeroRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const amount = prevEnemyHeroHp.current - enemyHeroHp;
      setDamageFloats([...damageFloats, { id: `enemyHero-${Date.now()}`, target: 'enemyHero', amount, x, y }]);
    }
    prevPlayerHeroHp.current = playerHeroHp;
    prevEnemyHeroHp.current = enemyHeroHp;

    // フィールドカードのHP変化
    playerFieldCards.forEach((c) => {
      const prev = prevFieldHp.current[c.uniqueId];
      if (prev !== undefined && c.hp !== undefined && c.hp < prev) {
        const ref = playerFieldRefs.current[c.uniqueId];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const amount = prev - (c.hp ?? 0);
          setDamageFloats([...damageFloats, { id: `${c.uniqueId}-${Date.now()}`, target: c.uniqueId, amount, x, y }]);
        }
      }
      prevFieldHp.current[c.uniqueId] = c.hp ?? 0;
    });

    enemyFieldCards.forEach((c) => {
      const prev = prevFieldHp.current[c.uniqueId];
      if (prev !== undefined && c.hp !== undefined && c.hp < prev) {
        const ref = enemyFieldRefs.current[c.uniqueId];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const amount = prev - (c.hp ?? 0);
          setDamageFloats([...damageFloats, { id: `${c.uniqueId}-${Date.now()}`, target: c.uniqueId, amount, x, y }]);
        }
      }
      prevFieldHp.current[c.uniqueId] = c.hp ?? 0;
    });
    // 削除されたカードは記録から除外
    Object.keys(prevFieldHp.current).forEach((id) => {
      if (!playerFieldCards.some((c) => c.uniqueId === id) && !enemyFieldCards.some((c) => c.uniqueId === id)) {
        delete prevFieldHp.current[id];
      }
    });
  }, [playerHeroHp, enemyHeroHp, playerFieldCards, enemyFieldCards, setDamageFloats, playerHeroRef, enemyHeroRef, playerFieldRefs, enemyFieldRefs]);

  // Canvas 矢印描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawArrow = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!draggingCard || !arrowStartPos.current) return;

      const isHandCard = playerHandCards.some(c => c.uniqueId === draggingCard);
      const draggingCardObj = playerHandCards.find(c => c.uniqueId === draggingCard) || playerFieldCards.find(c => c.uniqueId === draggingCard);
      const isHandSpell = isHandCard && draggingCardObj?.type === "spell";
      const isHealSpell = isHandSpell && (draggingCardObj?.effect === "heal_single");
      const isHasteSpell = isHandSpell && (draggingCardObj?.effect === "haste");
      const isDamageSpell = isHandSpell && !isHealSpell && !isHasteSpell;
      if (isHandCard && !isHandSpell) return;

      const attackingCard = playerFieldCards.find(c => c.uniqueId === draggingCard && c.canAttack);
      if (attackingCard || isHandSpell) {
        const targets: { x: number; y: number; kind: "damage" | "heal" }[] = [];

        if (isDamageSpell || attackingCard) {
          const canTargetHero = !((attackingCard as { rushInitialTurn?: boolean })?.rushInitialTurn);
          const hasWallGuardOnEnemy = enemyFieldCards.some((c) => (c as { wallGuard?: boolean }).wallGuard);

          if (canTargetHero && !hasWallGuardOnEnemy && enemyHeroRef.current) {
            const rect = enemyHeroRef.current.getBoundingClientRect();
            targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height, kind: "damage" });
          }

          for (const c of enemyFieldCards) {
            const ref = enemyFieldRefs.current[c.uniqueId];
            if (ref) {
              if ((c as { stealth?: boolean }).stealth) continue;
              const rect = ref.getBoundingClientRect();
              targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "damage" });
            }
          }
        }

        if (isHealSpell) {
          if (playerHeroRef.current) {
            const rect = playerHeroRef.current.getBoundingClientRect();
            targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height, kind: "heal" });
          }
          for (const c of playerFieldCards) {
            const ref = playerFieldRefs.current[c.uniqueId];
            if (ref) {
              const rect = ref.getBoundingClientRect();
              targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "heal" });
            }
          }
        }

        if (isHasteSpell) {
          for (const c of playerFieldCards) {
            if (c.canAttack) {
              const ref = playerFieldRefs.current[c.uniqueId];
              if (ref) {
                const rect = ref.getBoundingClientRect();
                targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "heal" });
              }
            }
          }
        }

        const startX = arrowStartPos.current.x;
        const startY = arrowStartPos.current.y;
        ctx.lineWidth = 3;
        for (const t of targets) {
          const endX = t.x;
          const endY = t.y;
          if (t.kind === "heal") {
            ctx.strokeStyle = "#4caf50";
            ctx.fillStyle = "#4caf50";
          } else {
            ctx.strokeStyle = "#ff5722";
            ctx.fillStyle = "#ff5722";
          }

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          const angle = Math.atan2(endY - startY, endX - startX);
          const arrowLength = 10;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.lineTo(endX, endY);
          ctx.fill();
        }
      }
    };

    let id: number;
    const tick = () => {
      drawArrow();
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [draggingCard, dragPosition, playerFieldCards, playerHandCards, enemyFieldCards]);

  // マリガンタイマー
  useEffect(() => {
    // coinResultが"deciding"でない（ルーレット完了後）かつshowCoinPopupがfalse（コイン結果ポップアップ消出後）＝マリガン画面表示時
    if (!preGame || coinResult === "deciding" || showCoinPopup) return;

    if (mulliganTimer <= 0) {
      // タイマー終了→自動で「交換せず開始」を実行
      startMatch();
      setShowGameStart(true);
      setTimeout(() => setShowGameStart(false), 1400);
      return;
    }

    const timer = setTimeout(() => {
      setMulliganTimer(mulliganTimer - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [preGame, coinResult, showCoinPopup, mulliganTimer, setMulliganTimer, startMatch, setShowGameStart]);

  // 敵の移動攻撃 (movingAttack) を受け取って attackClone を生成する
  useEffect(() => {
    if (!movingAttack) return;
    const { attackerId, targetId } = movingAttack;

    // 攻撃元要素 (敵フィールド) と攻撃先要素 (プレイヤー側) を参照
    const sourceEl = enemyFieldRefs.current[attackerId];
    const targetEl = targetId === 'hero' ? playerHeroRef.current : playerFieldRefs.current[targetId];
    if (!sourceEl || !targetEl) return;

    const start = sourceEl.getBoundingClientRect();
    const end = targetEl.getBoundingClientRect();

    // カードデータを取得
    const card = enemyFieldCards.find(c => c.uniqueId === attackerId);
    if (!card) return;

    // duration は見た目の調整
    const duration = 700;

    // setAttackClone を使って移動アニメを開始
    setAttackClone({
      key: `${attackerId}-${Date.now()}`,
      start,
      end,
      card: {
        name: card.name,
        attack: card.attack,
        hp: card.hp,
        maxHp: card.maxHp,
        image: (card as any).image,
      },
      started: false,
      duration,
    });

    // トランジション開始を次のtickで実行して transform をアニメーションさせる
    const t1 = setTimeout(() => {
      setAttackClone((prev: any) => prev ? { ...prev, started: true } : prev);
    }, 50);

    // 即時ダメージフロートを出す（攻撃と同時に視認できるように）
    try {
      const dmg = card.attack ?? 0;
      const targetRect = end;
      const x = targetRect.left + targetRect.width / 2;
      const y = targetRect.top + targetRect.height / 2;
      // setDamageFloats は props で渡されるので既存の配列に新しいフロートを追加
      setDamageFloats([...damageFloats, { id: `attack-${Date.now()}`, target: targetId === 'hero' ? 'playerHero' : (targetId as string), amount: dmg, x, y }]);
    } catch (e) {
      console.warn('[GameField] failed to show immediate damage float', e);
    }

    // 終了後にクリーンアップ
    const t2 = setTimeout(() => {
      setAttackClone(null);
    }, duration + 120);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setAttackClone(null);
    };
  }, [movingAttack, enemyFieldRefs, playerFieldRefs, playerHeroRef, enemyFieldCards, setAttackClone]);

  // ゲーム画面のメイン
  return (
    <div className={styles.field}>
      {/* ダメージフロート */}
      <DamageFloater floats={damageFloats} />

      {/* プリゲーム */}
      {preGame && (
        <PreGame
          coinResult={coinResult}
          showCoinPopup={showCoinPopup}
          rouletteRunning={rouletteRunning}
          rouletteLabel={rouletteLabel}
          playerHandCards={playerHandCards}
          currentMana={currentMana}
          mulliganTimer={mulliganTimer}
          swapIds={swapIds}
          onRouletteAnimEnd={() => {
            // ルーレットアニメーション終了後、遅延を入れてから処理
            setTimeout(() => {
              const winner = Math.random() < 0.5 ? "player" : "enemy";
              finalizeCoin(winner as "player" | "enemy");
              setRouletteRunning(false);
              // コイン結果をポップアップで表示
              setShowCoinPopup(true);
              // 2秒後にコイン結果を消してマリガン画面に遷移
              setTimeout(() => {
                setShowCoinPopup(false);
              }, 2000);
            }, 100);
          }}
          onSwapToggle={(cardId: string) => {
            setSwapIds(swapIds.includes(cardId) ? swapIds.filter(id => id !== cardId) : [...swapIds, cardId]);
          }}
          onMulliganSubmit={() => {
            // マリガン実行
            const keep = playerHandCards.filter(c => !swapIds.includes(c.uniqueId)).map(c => c.uniqueId);
            doMulligan(keep);
            setShowCoinPopup(false);
            setTimeout(() => {
              startMatch();
              setShowGameStart(true);
              setTimeout(() => setShowGameStart(false), 1400);
            }, 2000);
          }}
          onMulliganSkip={() => {
            startMatch();
            setShowGameStart(true);
            setTimeout(() => setShowGameStart(false), 1400);
          }}
          setRouletteRunning={setRouletteRunning}
          setSwapIds={setSwapIds}
        />
      )}

      {/* Canvas 矢印 */}
      <canvas ref={canvasRef} style={{ position: "fixed", left: 0, top: 0, pointerEvents: "none", zIndex: 900 }} />

      {/* ドラッグ中のカード表示 */}
      {draggingCard && (() => {
        const card = playerHandCards.find(c => c.uniqueId === draggingCard) || playerFieldCards.find(c => c.uniqueId === draggingCard);
        if (!card) return null;

        const cardWidth = 70;
        const cardHeight = 100;

        return (
          <div
            style={{
              position: 'fixed',
              left: dragPosition.x - cardWidth / 2,
              top: dragPosition.y - cardHeight / 2,
              width: cardWidth,
              height: cardHeight,
              zIndex: 950,
              pointerEvents: 'none',
              opacity: 0.9,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
            }}
            className={styles.card}
          >
            {card.image && <img src={card.image} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            {card.type === 'follower' && (
              <>
                <div className={styles.card_hp}><p>{Math.min(card.hp ?? 0, card.maxHp ?? 0)}</p></div>
                <div className={styles.card_attack}><p>{card.attack ?? 0}</p></div>
              </>
            )}
            <div className={styles.card_cost}><p>{card.cost ?? 0}</p></div>
          </div>
        );
      })()}

      {/* メニューボタン */}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1200, display: 'flex', gap: 8 }}>
        <button onClick={() => { resetGame('cpu'); }}>リスタート</button>
        <button onClick={() => { resetGame('cpu'); }}>リタイア</button>
      </div>

      {/* AI攻撃アニメーション */}
      {attackClone && (() => {
        const { start, end, card, started, duration } = attackClone;
        const deltaX = end.left - start.left;
        const deltaY = end.top - start.top;
        const baseStyle: React.CSSProperties = {
          position: "fixed",
          left: start.left,
          top: start.top,
          width: start.width,
          height: start.height,
          transform: started ? `translate(${deltaX}px, ${deltaY}px)` : "translate(0px, 0px)",
          transition: `transform ${duration}ms ease, opacity ${Math.max(200, duration / 3)}ms ease`,
          zIndex: 980,
          pointerEvents: "none",
          opacity: started ? 0.95 : 1,
        };

        return (
          <div style={baseStyle} className={styles.card}>
            {card.image && <img src={card.image} alt={card.name} />}
            <div className={styles.card_hp}><p>{Math.min(card.hp ?? 0, card.maxHp ?? 0)}</p></div>
            <div className={styles.card_attack}><p>{card.attack ?? 0}</p></div>
            <div style={{ padding: 6 }}>{card.name}</div>
          </div>
        );
      })()}

      {/* ターンモーダル */}
      {showTurnModal && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 20, borderRadius: 12 }}>
            <h1 style={{ fontSize: 45, margin: 0 }}>{isPlayerTurn ? "Your Turn" : "Enemy Turn"}</h1>
          </div>
        </div>
      )}

      {/* GameStart 表示 */}
      {showGameStart && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 40, borderRadius: 12 }}>
            <h1 style={{ fontSize: 72, margin: 0 }}>GameStart</h1>
          </div>
        </div>
      )}

      {/* 敵エリア */}
      <EnemyArea
        enemyHeroHp={enemyHeroHp}
        enemyHandCards={enemyHandCards}
        enemyFieldCards={enemyFieldCards}
        enemyDeck={enemyDeck}
        enemyGraveyard={enemyGraveyard}
        enemyCurrentMana={enemyCurrentMana}
        turnSecondsRemaining={turnSecondsRemaining}
        isPlayerTurn={isPlayerTurn}
        draggingCard={draggingCard}
        playerHandCards={playerHandCards}
        enemyAttackAnimation={enemyAttackAnimation}
        enemySpellAnimation={enemySpellAnimation}
        onDragOver={(e) => {
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const isHeal = handCard && handCard.effect === "heal_single";
          if (draggingCard && (!isHeal || !handCard)) e.preventDefault();
        }}
        onDrop={(targetId) => {
          if (!draggingCard) return;
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          if (handCard && handCard.type === "spell") {
            castSpell(draggingCard, targetId, true);
          } else {
            attack(draggingCard, targetId, true);
          }
          setDraggingCard(null);
          arrowStartPos.current = null;
        }}
        onCardClick={(cardId: string) => setDescCardId(descCardId === cardId ? null : cardId)}
        enemyHeroRef={enemyHeroRef}
        enemyFieldRefs={enemyFieldRefs}
      />

      {/* プレイヤーエリア */}
      <PlayerArea
        playerHeroHp={playerHeroHp}
        playerHandCards={playerHandCards}
        playerFieldCards={playerFieldCards}
        playerDeck={deck}
        playerGraveyard={playerGraveyard}
        currentMana={currentMana}
        turnSecondsRemaining={turnSecondsRemaining}
        isPlayerTurn={isPlayerTurn}
        draggingCard={draggingCard}
        isHandExpanded={isHandExpanded}
        activeHandCardId={activeHandCardId}
        swapIds={swapIds}
        preGame={preGame}
        descCardId={descCardId}
        enemyAttackAnimation={enemyAttackAnimation}
        enemySpellAnimation={enemySpellAnimation}
        setIsHandExpanded={setIsHandExpanded}
        setActiveHandCardId={setActiveHandCardId}
        setDescCardId={setDescCardId}
        setSwapIds={setSwapIds}
        setDraggingCard={setDraggingCard}
        setDragPosition={setDragPosition}
        setArrowStartPos={(pos) => { arrowStartPos.current = pos; }}
        onDragStart={(card, e) => {
          if (!isPlayerTurn) return;
          setDraggingCard(card.uniqueId);
          const rect = e.currentTarget.getBoundingClientRect();
          const startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          arrowStartPos.current = startPos;
          setDragPosition(startPos);
        }}
        onDragEnd={() => {
          setDraggingCard(null);
          arrowStartPos.current = null;
        }}
        onDragOver={(e) => {
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const isHeal = handCard && handCard.effect === "heal_single";
          if (draggingCard && isHeal) e.preventDefault();
        }}
        onDrop={(card) => {
          if (!draggingCard) return;
          const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
          const isHeal = handCard && handCard.effect === "heal_single";
          if (handCard && handCard.type === "spell" && isHeal) {
            castSpell(draggingCard, card?.uniqueId || "hero", true);
          }
          setDraggingCard(null);
          arrowStartPos.current = null;
        }}
        onPlayerFieldDrop={() => {
          if (!draggingCard) return;
          const card = playerHandCards.find((c) => c.uniqueId === draggingCard);
          if (!card) return;
          if (preGame && coinResult !== 'deciding') {
            setSwapIds(swapIds.includes(card.uniqueId) ? swapIds.filter(id => id !== card.uniqueId) : [...swapIds, card.uniqueId]);
          } else if (card.type !== "spell") {
            playCardToField(card);
          }
          setDraggingCard(null);
          arrowStartPos.current = null;
        }}
        onCardClick={(cardId: string) => setDescCardId(descCardId === cardId ? null : cardId)}
        onCardSwap={(cardId: string) => {
          setSwapIds(swapIds.includes(cardId) ? swapIds.filter(id => id !== cardId) : [...swapIds, cardId]);
        }}
        playerHeroRef={playerHeroRef}
        playerBattleRef={playerBattleRef}
        playerFieldRefs={playerFieldRefs}
        handAreaRef={handAreaRef}
        collapseHand={collapseHand}
      />

      {/* ターンエンドボタン */}
      <div className={styles.field_turn_wrapper}>
        <div className={styles.field_turn}>
          <button
            onClick={() => endTurn()}
            disabled={!isPlayerTurn || aiRunning}
          >
            <div
              className={styles.flame_container}
              style={{
                '--flame-intensity': Math.max(0.2, turnSecondsRemaining / MAX_TIME).toFixed(2)
              } as React.CSSProperties}
            />
            <span className={styles.field_turn_text}>TurnEnd</span>
          </button>
        </div>
      </div>

      {/* ゲーム終了 */}
      {gameOver.over && (
        <GameOver
          winner={gameOver.winner}
          onRestart={() => resetGame("cpu")}
          onMenu={() => {}}
        />
      )}
    </div>
  );
};
