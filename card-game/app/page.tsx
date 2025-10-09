// page.tsx
"use client";
import React, { useRef, useEffect, useState } from "react";
import CardItem from "./components/CardItem";
import ManaBar from "./components/ManaBar";
import useGame from "./Game";
import styles from "./assets/css/Game.Master.module.css";

const Game: React.FC = () => {
  const {
    playerHandCards,
    playerFieldCards,
    playerHeroHp,
    enemyHandCards,
    enemyFieldCards,
    enemyHeroHp,
    draggingCard,
    setDraggingCard,
    dragPosition,
    setDragPosition,
    playerBattleRef,
    currentMana,
    enemyCurrentMana,
    playCardToField,
    endTurn,
    attack,
    castSpell,
    deck,
    playerGraveyard,
    enemyDeck,
    enemyGraveyard,
    turn,
    turnSecondsRemaining,
    aiRunning,
    movingAttack,
  } = useGame();
  const isPlayerTurn = (turn % 2) === 1;
  // aiRunning はフックから受け取る

  // 敵ターン開始時に中央モーダルを短時間表示するための state
  const [showTurnModal, setShowTurnModal] = useState<boolean>(false);

  useEffect(() => {
    // ターンが切り替わった瞬間、それぞれ短時間モーダルを表示する
    setShowTurnModal(true);
    const duration = isPlayerTurn ? 2000 : 1200; // プレイヤーは最初の2秒間表示、敵は1.2秒
    const t = setTimeout(() => setShowTurnModal(false), duration);
    return () => clearTimeout(t);
  }, [isPlayerTurn, turn]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enemyHeroRef = useRef<HTMLDivElement>(null);
  const enemyFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const playerHeroRef = useRef<HTMLDivElement>(null);
  const playerFieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [arrowStartPos, setArrowStartPos] = useState<{ x: number; y: number } | null>(null);

  // AI攻撃アニメ用のクローン情報
  const [attackClone, setAttackClone] = useState<null | {
    key: string;
    start: DOMRect;
    end: DOMRect;
    card: { name?: string; attack?: number; hp?: number; maxHp?: number; image?: string };
    started: boolean;
    duration: number;
  }>(null);

  // movingAttack が通知されたらクローンを作成して移動アニメを始める
  useEffect(() => {
    if (!movingAttack) return;
    const attackerEl = enemyFieldRefs.current[movingAttack.attackerId];
    const targetEl = (movingAttack.targetId === "hero") ? playerHeroRef.current : playerFieldRefs.current[movingAttack.targetId as string];
    if (!attackerEl || !targetEl) return;
    const aRect = attackerEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();

    // カード情報を読み取れるなら入れる（最低限の表示用）
    const cardName = attackerEl.getAttribute("aria-label") || undefined;
    const attackText = attackerEl.querySelector(`.${styles.card_attack}`)?.textContent;
    const hpText = attackerEl.querySelector(`.${styles.card_hp}`)?.textContent;

    const duration = 900; // ms

    setAttackClone({
      key: `${movingAttack.attackerId}-${Date.now()}`,
      start: aRect,
      end: tRect,
      card: { name: cardName, attack: attackText ? Number(attackText) : undefined, hp: hpText ? Number(hpText) : undefined },
      started: false,
      duration,
    });

    // 少し次のレンダーを待って transform を開始させる
    const startTimer = setTimeout(() => {
      setAttackClone((c) => (c ? { ...c, started: true } : c));
    }, 50);

    // duration + fade でクローンを消す
    const cleanupTimer = setTimeout(() => {
      setAttackClone(null);
    }, duration + 300);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(cleanupTimer);
      setAttackClone(null);
    };
  }, [movingAttack]);

  const getHpClass = (hp: number) => {
    if (hp === 20) return styles.hpWhite;
    if (hp >= 11) return styles.hpYellow;
    return styles.hpRed;
  };

  // マウス座標を常に更新
  useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const drawArrow = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!draggingCard || !arrowStartPos) return;

    // 手札カードでもスペルなら矢印を描画する
    const isHandCard = playerHandCards.some(c => c.uniqueId === draggingCard);
    const draggingCardObj = playerHandCards.find(c => c.uniqueId === draggingCard) || playerFieldCards.find(c => c.uniqueId === draggingCard);
    const isHandSpell = isHandCard && draggingCardObj?.type === "spell";
    const isHealSpell = isHandSpell && (draggingCardObj?.name?.includes("回復") || draggingCardObj?.name?.toLowerCase().includes("heal"));
    const isDamageSpell = isHandSpell && !isHealSpell;
    if (isHandCard && !isHandSpell) return;

    const attackingCard = playerFieldCards.find(c => c.uniqueId === draggingCard && c.canAttack);
    // フィールドからの攻撃、またはスペルのドラッグ時はターゲット候補を算出して全てに矢印を描画する
    if (attackingCard || isHandSpell) {
      const targets: { x: number; y: number; kind: "damage" | "heal" }[] = [];

      // 敵ヒーロー／敵フォロワー：ダメージ系スペル／攻撃は敵側をターゲットにできる
      if (isDamageSpell || attackingCard) {
        if (enemyHeroRef.current) {
          const rect = enemyHeroRef.current.getBoundingClientRect();
          targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height, kind: "damage" });
        }
        for (const c of enemyFieldCards) {
          const ref = enemyFieldRefs.current[c.uniqueId];
          if (ref) {
            const rect = ref.getBoundingClientRect();
            targets.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: "damage" });
          }
        }
      }

      // 回復系スペルは味方側をターゲットにできる
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

      // 取得した全ターゲットへ矢印を描画
      const startX = arrowStartPos.x;
      const startY = arrowStartPos.y;
      ctx.lineWidth = 3;
      for (const t of targets) {
        const endX = t.x;
        const endY = t.y;
        // 色分け
        if (t.kind === "heal") {
          ctx.strokeStyle = "#4caf50"; // 緑
          ctx.fillStyle = "#4caf50";
        } else {
          ctx.strokeStyle = "#ff5722"; // 赤系
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
    } else {
      // ターゲット候補がない場合はカレント位置へ単一の矢印（ドラッグ位置の視認用）
      const startX = arrowStartPos.x;
      const startY = arrowStartPos.y;
      const endX = dragPosition.x;
      const endY = dragPosition.y;
      ctx.strokeStyle = "rgba(200,200,200,0.9)";
      ctx.fillStyle = "rgba(200,200,200,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowLength = 8;
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
    };

    let id: number;
    const tick = () => {
      drawArrow();
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [draggingCard, dragPosition, arrowStartPos, playerFieldCards, playerHandCards, enemyFieldCards]);


  return (
    <div className={styles.field}>
      {/* キャンバス（矢印描画用オーバーレイ） */}
      <canvas ref={canvasRef} style={{ position: "fixed", left: 0, top: 0, pointerEvents: "none", zIndex: 900 }} />

      {/* AIの攻撃移動をクローン要素で滑らかに表示 */}
      {/** movingAttack が通知されたらクローンを作り transform で移動させる */}
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

        // 内部は CardItem と同じ構造になるように見た目を合わせる（最小限）
        return (
          <div style={baseStyle} className={styles.card}>
            {card.image && <img src={card.image} alt={card.name} />}
            <div className={styles.card_hp}><p>{Math.min(card.hp ?? 0, card.maxHp ?? 0)}</p></div>
            <div className={styles.card_attack}><p>{card.attack ?? 0}</p></div>
            <div style={{ padding: 6 }}>{card.name}</div>
          </div>
        );
      })()}
      {showTurnModal && (
        <div className={styles.turnModal}>{isPlayerTurn ? "Your Turn" : "Enemy Turn..."}</div>
      )}

      {/* 敵エリア */}
      <div className={styles.field_enemy}>
        <div
          ref={enemyHeroRef}
          className={styles.field_enemy_hero}
          onDragOver={(e) => {
            const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
            const isHeal = handCard && (handCard.name?.includes("回復") || handCard.name?.toLowerCase().includes("heal"));
            if (draggingCard && (!isHeal || !handCard)) e.preventDefault();
          }}
          onDrop={() => {
            if (!draggingCard) return;
            const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
            const isHeal = handCard && (handCard.name?.includes("回復") || handCard.name?.toLowerCase().includes("heal"));
            if (handCard && handCard.type === "spell") {
              if (isHeal) {
                // 回復スペルは敵ヒーローに使えない
              } else {
                castSpell(draggingCard, "hero", true);
              }
            } else {
              attack(draggingCard, "hero", true);
            }
            setDraggingCard(null);
            setArrowStartPos(null);
          }}
        >
          <div className={styles.field_enemy_hero_wrap}>
            <div className={styles.field_enemy_hero_hp}>
              <p className={getHpClass(enemyHeroHp)}>{enemyHeroHp}</p>
            </div>
          </div>
        </div>

        <div className={styles.field_enemy_battle}>
          {enemyFieldCards.map((card) => (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              style={(card as any).isAnimating ? { transform: "translateY(-40px)", opacity: 0 } : undefined}
              onDragOver={(e) => {
                const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
                const isHeal = handCard && (handCard.name?.includes("回復") || handCard.name?.toLowerCase().includes("heal"));
                if (draggingCard && (!isHeal || !handCard)) e.preventDefault();
              }}
              onDrop={() => {
                if (!draggingCard) return;
                const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
                const isHeal = handCard && (handCard.name?.includes("回復") || handCard.name?.toLowerCase().includes("heal"));
                if (handCard && handCard.type === "spell") {
                  if (isHeal) {
                    // 回復スペルを敵フォロワーに使うのは無効にする
                  } else {
                    castSpell(draggingCard, card.uniqueId, true);
                  }
                } else {
                  attack(draggingCard, card.uniqueId, true);
                }
                setDraggingCard(null);
                setArrowStartPos(null);
              }}
              isTarget={false}
              ref={(el: HTMLDivElement | null) => {
                enemyFieldRefs.current[card.uniqueId] = el;
              }}
            />
          ))}
        </div>

        <div className={styles.field_enemy_hand}>
          {enemyHandCards.map((card) => (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
            />
          ))}
        </div>

        <div className={styles.field_enemy_mana}>
          <ManaBar maxMana={10} currentMana={enemyCurrentMana} />
        </div>

        {/* エネミー持ち時間（動的表示） */}
        <div className={styles.field_enemy_timer}>
          <p>{!isPlayerTurn ? turnSecondsRemaining : 60}</p>
        </div>

        {/* エネミーステータス */}
        <div className={styles.field_enemy_status}>
          <p className={styles.field_enemy_status_hand}>{enemyHandCards.length}</p>
          <p className={styles.field_enemy_status_deck}>{enemyDeck.length}</p>
          <p className={styles.field_player_status_death}>{enemyGraveyard.length}</p>
        </div>

      </div>

        

      {/* プレイヤーエリア */}
      <div className={styles.field_player}>
        <div className={styles.field_player_hero}>
          <div className={styles.field_player_hero_wrap}>
            <div
              ref={playerHeroRef}
              className={styles.field_player_hero_hp}
              onDragOver={(e) => {
                // プレイヤーヒーローは回復スペルのみ受け付ける
                const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
                const isHeal = handCard && (handCard.name?.includes("回復") || handCard.name?.toLowerCase().includes("heal"));
                if (draggingCard && isHeal) e.preventDefault();
              }}
              onDrop={() => {
                if (!draggingCard) return;
                const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
                const isHeal = handCard && (handCard.name?.includes("回復") || handCard.name?.toLowerCase().includes("heal"));
                if (handCard && handCard.type === "spell" && isHeal) {
                  castSpell(draggingCard, "hero", true);
                }
                setDraggingCard(null);
                setArrowStartPos(null);
              }}
            >
              <p className={getHpClass(playerHeroHp)}>{playerHeroHp}</p>
            </div>
          </div>
        </div>

        <div
          className={styles.field_player_battle}
          ref={playerBattleRef}
          onDragOver={(e) => {
            const isHandCard = playerHandCards.some((c) => c.uniqueId === draggingCard);
            if (draggingCard && isHandCard) e.preventDefault();
          }}
          onDrop={() => {
            const card = playerHandCards.find((c) => c.uniqueId === draggingCard);
            if (draggingCard && card) {
              // スペルはフィールドに出せないのでスキップ
              if (card.type !== "spell") {
                playCardToField(card);
              }
              setDraggingCard(null);
              setArrowStartPos(null);
            }
          }}
        >
          {playerFieldCards.map((card) => (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              draggable={card.canAttack}
              onDragStart={(e) => {
                if (!isPlayerTurn) return;
                setDraggingCard(card.uniqueId);
                const rect = e.currentTarget.getBoundingClientRect();
                const startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                setArrowStartPos(startPos);
                setDragPosition(startPos);
              }}
              onDragEnd={() => {
                setDraggingCard(null);
                setArrowStartPos(null);
              }}
              // プレイヤーフィールドの各カードも回復スペルのドロップ対象にする
              onDragOver={(e) => {
                const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
                const isHeal = handCard && (handCard.name?.includes("回復") || handCard.name?.toLowerCase().includes("heal"));
                if (draggingCard && isHeal) e.preventDefault();
              }}
              onDrop={() => {
                if (!draggingCard) return;
                const handCard = playerHandCards.find((c) => c.uniqueId === draggingCard);
                const isHeal = handCard && (handCard.name?.includes("回復") || handCard.name?.toLowerCase().includes("heal"));
                if (handCard && handCard.type === "spell" && isHeal) {
                  castSpell(draggingCard, card.uniqueId, true);
                }
                setDraggingCard(null);
                setArrowStartPos(null);
              }}
              ref={(el: HTMLDivElement | null) => { playerFieldRefs.current[card.uniqueId] = el; }}
            />
          ))}
        </div>

        <div className={styles.field_player_hand}>
          {playerHandCards.map((card) => (
            <CardItem
              key={card.uniqueId}
              {...card}
              hp={card.hp ?? 0}
              maxHp={card.maxHp ?? 0}
              attack={card.attack ?? 0}
              draggable
              inHand
              currentMana={currentMana}
              onDragStart={(e) => {
                if (!isPlayerTurn) return;
                setDraggingCard(card.uniqueId);
                const rect = e.currentTarget.getBoundingClientRect();
                const startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                setArrowStartPos(startPos);
                setDragPosition(startPos);
              }}
              onDragEnd={() => {
                setDraggingCard(null);
                setArrowStartPos(null);
              }}
            />
          ))}
        </div>

        <div className={styles.field_player_mana}>
          <ManaBar maxMana={10} currentMana={currentMana} />
        </div>

        {/* プレイヤー持ち時間（動的表示） */} 
        <div className={styles.field_player_timer}> 
          <p>{isPlayerTurn ? turnSecondsRemaining : 60}</p> 
        </div> 

        {/* プレイヤーステータス */}
        <div className={styles.field_player_status}>
          <p className={styles.field_player_status_hand}>{playerHandCards.length}</p>
          <p className={styles.field_player_status_deck}>{deck.length}</p>
          <p className={styles.field_player_status_death}>{playerGraveyard.length}</p>
        </div>

      </div>

      <div className={styles.field_turn}>
        <button onClick={endTurn} disabled={!isPlayerTurn || aiRunning}>
          TurnEnd
        </button>
      </div>
    </div>
  );
};

export default Game;