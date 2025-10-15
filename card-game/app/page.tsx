// page.tsx
"use client";
import React, { useRef, useEffect, useState } from "react";
import CardItem from "./components/CardItem";
import ManaBar from "./components/ManaBar";
import useGame from "./Game";
import styles from "./assets/css/Game.Master.module.css";
import StartMenu from "./components/StartMenu";
import GameOver from "./components/GameOver";


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
    gameOver,
    resetGame,
    preGame,
    coinResult,
    finalizeCoin,
    doMulligan,
    startMatch,
  } = useGame();
  // 画面モード: menu | game | deck
  const [mode, setMode] = useState<"menu" | "game" | "deck">("menu");
  // プリゲーム UI state
  // ルーレット中フラグ / 表示ラベル
  const [rouletteRunning, setRouletteRunning] = useState<boolean>(false);
  const [rouletteLabel, setRouletteLabel] = useState<string>("...");
  // コイン結果ポップアップ制御（ルーレット直後に短く表示してからマリガンへ移る）
  const [showCoinPopup, setShowCoinPopup] = useState<boolean>(false);
  // マリガン用: フィールドへ置かれた（交換したい）カードの uniqueId 集合
  const [swapIds, setSwapIds] = useState<string[]>([]);
  // マリガン残り時間（秒、最大15秒）
  const [mulliganTimer, setMulliganTimer] = useState<number>(15);
  const [keepIds, setKeepIds] = useState<string[]>([]);
  // 試合開始の大きな表示を一瞬出す
  const [showGameStart, setShowGameStart] = useState<boolean>(false);

  // 見た目の演出（GameStart 表示など）を先に行ってから、内部フックの startMatch を呼ぶためのラッパー
  const startMatchWithVisual = () => {
    // only trigger if we're still in preGame; guard against accidental re-triggers mid-match
    if (!preGame) return;
    // clear any pending popup/interval from the mulligan flow so they don't re-trigger GameStart
    if (popupTimerRef.current !== null) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    if (mulliganIvRef.current !== null) {
      clearInterval(mulliganIvRef.current);
      mulliganIvRef.current = null;
    }
    // hide pregame modal and show GameStart overlay
    setShowCoinPopup(false);
    setMulliganTimer(0);
    startMatch();
    setShowGameStart(true);
    setTimeout(() => setShowGameStart(false), 1400);
  };

  const popupTimerRef = useRef<number | null>(null);
  const mulliganIvRef = useRef<number | null>(null);

  // ルーレット演出：プリゲーム開始かつ先攻決定中のときに回す
  useEffect(() => {
    if (!preGame || coinResult !== "deciding") return;
    // トリガーして CSS アニメを走らせる（onAnimationEnd で結果確定）
    setRouletteRunning(true);
    setRouletteLabel("...");
    return () => {
      // cleanup
      setRouletteRunning(false);
    };
  }, [preGame, coinResult]);

  // coinResult が決まったらマリガン用の選択を初期化、マリガンタイマーを開始
  useEffect(() => {
    if (coinResult !== "deciding") {
      setKeepIds([]);
      setSwapIds([]);
      // ルーレット終了のポップアップを表示してからマリガンを開始する
      setShowCoinPopup(true);
      const popupDuration = 1400;
      // store timer ids in refs so they can be cleared if the user starts early
      popupTimerRef.current = window.setTimeout(() => {
        setShowCoinPopup(false);
        // マリガンのカウントダウン（最大15秒）。0になったらそのまま試合開始
        setMulliganTimer(15);
        mulliganIvRef.current = window.setInterval(() => {
          setMulliganTimer((t) => {
            if (t <= 1) {
              if (mulliganIvRef.current !== null) {
                clearInterval(mulliganIvRef.current);
                mulliganIvRef.current = null;
              }
              // 時間切れなら何も交換せずにそのまま開始（視覚表示付き）
              startMatchWithVisual();
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }, popupDuration) as unknown as number;

      return () => {
        if (popupTimerRef.current !== null) {
          clearTimeout(popupTimerRef.current);
          popupTimerRef.current = null;
        }
        if (mulliganIvRef.current !== null) {
          clearInterval(mulliganIvRef.current);
          mulliganIvRef.current = null;
        }
      };
    }
    return;
  }, [coinResult]);
  const isPlayerTurn = (turn % 2) === 1;
  // aiRunning はフックから受け取る

  // 敵ターン開始時に中央モーダルを短時間表示するための state
  const [showTurnModal, setShowTurnModal] = useState<boolean>(false);

  useEffect(() => {
    // ターンが切り替わった瞬間、それぞれ短時間モーダルを表示する
    // プリゲーム（ルーレット/マリガン）や GameStart 表示中はターンモーダルを表示しない
    if (preGame || showGameStart) {
      setShowTurnModal(false);
      return;
    }
    setShowTurnModal(true);
    const duration = isPlayerTurn ? 2000 : 1200; // プレイヤーは最初の2秒間表示、敵は1.2秒
    const t = setTimeout(() => setShowTurnModal(false), duration);
    return () => clearTimeout(t);
  }, [isPlayerTurn, turn, preGame, showGameStart]);

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

  // NOTE: GameStart 表示は startMatchWithVisual のみで制御する（重複表示を避けるため）

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


  // メニューモードは専用コンポーネントを表示
  if (mode === "menu") {
    return (
      <div>
        <StartMenu
          onSelectMode={(m) => {
            // CPU戦を選ぶとゲームを初期化してゲーム画面へ
            if (m === "cpu") resetGame("cpu");
            setMode("game");
          }}
          onDeck={() => setMode("deck")}
        />
      </div>
    );
  }

  // デッキ作成はプレースホルダ
  if (mode === "deck") {
    return (
      <div style={{ padding: 40 }}>
        <h2>デッキ作成（準備中）</h2>
        <p>ここにデッキ作成 UI を実装します。</p>
        <button onClick={() => setMode("menu")}>戻る</button>
      </div>
    );
  }

  return (
    <div className={styles.field}>
      {/* プリゲーム：ルーレット演出 */}
      {preGame && coinResult === "deciding" && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 30, borderRadius: 8, textAlign: 'center' }}>
            <h3>先攻/後攻をルーレットで決定中...</h3>
            <div style={{ marginTop: 12 }} className={styles.rouletteWrapper}>
              <div
                className={`${styles.roulette} ${rouletteRunning ? styles.spin : ''}`}
                onAnimationEnd={() => {
                  // アニメ終了で結果を確定
                  const winner = Math.random() < 0.5 ? "player" : "enemy";
                  finalizeCoin(winner as "player" | "enemy");
                  setRouletteRunning(false);
                }}
                role="img"
                aria-label="roulette"
              >
                <div className={styles.rouletteLabel}>{rouletteRunning ? '...' : (rouletteLabel === 'player' ? 'プレイヤー' : '敵')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* プリゲーム：マリガン画面（ルーレット後に表示） */}
  {/* ルーレットの結果を短くポップアップ表示 -> その後マリガンを表示 */}
  {preGame && coinResult !== "deciding" && showCoinPopup && (
        <div className={styles.coinPopup} role="alert" aria-live="polite">
          <div className={styles.coinPopupInner}>
            <div className={styles.coinPopupTitle}>先攻/後攻が決定しました</div>
            <div className={styles.coinPopupWinner}>{coinResult === 'player' ? 'あなたは先攻' : 'あなたは後攻'}</div>
          </div>
        </div>
      )}

  {preGame && coinResult !== "deciding" && !showCoinPopup && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.95)', color: '#fff', padding: 20, borderRadius: 8 , textAlign: "center"}}>
            <h3>{coinResult === 'player' ? 'あなたは先攻' : 'あなたは後攻'}</h3>
            <p>交換したいカードを選択してください<br></br>（選択後は「交換」を押してください）。<br></br>制限時間: {mulliganTimer}s</p>

            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: "center", justifyContent: "center" }}>
              {playerHandCards.map((c) => {
                const marked = swapIds.includes(c.uniqueId);
                return (
                  <div key={c.uniqueId} style={{ padding: 6 }}>
                    <CardItem
                      {...c}
                      hp={c.hp ?? 0}
                      maxHp={c.maxHp ?? 0}
                      attack={c.attack ?? 0}
                      inHand
                      currentMana={currentMana}
                      selected={marked}
                      noStatus={true}
                      onClick={() => {
                        // click で交換候補の ON/OFF
                        setSwapIds((ids) => ids.includes(c.uniqueId) ? ids.filter(id => id !== c.uniqueId) : [...ids, c.uniqueId]);
                      }}
                      style={{ width: 80, height: 110 }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => {
                const keep = playerHandCards.filter(c => !swapIds.includes(c.uniqueId)).map(c => c.uniqueId);
                doMulligan(keep);
                startMatchWithVisual();
              }}>交換</button>
              <button onClick={() => { startMatchWithVisual(); }}>交換せず開始</button>
            </div>
          </div>
        </div>
      )}
      {/* キャンバス（矢印描画用オーバーレイ） */}
      <canvas ref={canvasRef} style={{ position: "fixed", left: 0, top: 0, pointerEvents: "none", zIndex: 900 }} />

      {/* 右上メニュー: リスタート / リタイア(メニューへ) */}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1200, display: 'flex', gap: 8 }}>
        <button onClick={() => { resetGame('cpu'); setMode('game'); }}>リスタート</button>
        <button onClick={() => { resetGame('cpu'); setMode('menu'); }}>リタイア</button>
      </div>


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
        <div className={styles.turnModal}>{isPlayerTurn ? "Your Turn" : "Enemy Turn"}</div>
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
            // 敵の手札は裏向きで表示（画像は後で差し替え予定）。
            // ここでは情報を見せないため CardItem は使わず、灰色の裏面を描画します。
            <div key={card.uniqueId} className={styles.card_back} aria-hidden={true} />
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
            if (!draggingCard) return;
            const card = playerHandCards.find((c) => c.uniqueId === draggingCard);
            if (!card) return;
            // プリゲーム（マリガン）中はフィールドへの配置は"交換候補の登録"として扱う
            if (preGame && coinResult !== 'deciding') {
              setSwapIds((ids) => ids.includes(card.uniqueId) ? ids.filter(id => id !== card.uniqueId) : [...ids, card.uniqueId]);
              setDraggingCard(null);
              setArrowStartPos(null);
              return;
            }
            // 通常時はカードを場に出す
            if (card.type !== "spell") {
              playCardToField(card);
            }
            setDraggingCard(null);
            setArrowStartPos(null);
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
              style={swapIds.includes(card.uniqueId) ? { border: '3px solid limegreen' } : undefined}
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
        <button
          onClick={() => {
            if (preGame && coinResult !== 'deciding') {
              // プリゲーム中の TurnEnd は交換確定操作
              const keep = playerHandCards.filter(c => !swapIds.includes(c.uniqueId)).map(c => c.uniqueId);
              doMulligan(keep);
              startMatchWithVisual();
              return;
            }
            endTurn();
          }}
          disabled={!isPlayerTurn || aiRunning}
        >
          {preGame && coinResult !== 'deciding' ? '交換' : 'TurnEnd'}
        </button>
      </div>
      {/* 試合開始時の大きな表示 */}
      {showGameStart && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: 40, borderRadius: 12 }}>
            <h1 style={{ fontSize: 72, margin: 0 }}>GameStart</h1>
          </div>
        </div>
      )}
      {/* 勝敗表示 */}
      {gameOver.over && (
        <GameOver
          winner={gameOver.winner}
          onRestart={() => {
            resetGame("cpu");
            setMode("game");
          }}
          onMenu={() => setMode("menu")}
        />
      )}
    </div>
  );
};

export default Game;