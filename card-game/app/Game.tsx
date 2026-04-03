// Game.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "./data/cards";
import { cards } from "./data/cards";
import { deck as initialDeck, drawInitialHand } from "./data/game";
import { createDeck } from "./data/deck";
import { runEnemyTurn } from "./data/enemyAI";
import type { AIGameContext } from "./types/gameTypes";
import { TurnTimer } from "./data/turnTimer";
import { MAX_HAND, MAX_MANA, MAX_HERO_HP, MAX_FIELD_SIZE, TURN_DURATION_SECONDS } from "./constants/gameConstants";
import { createUniqueCard, createFieldCard, addCardToHand } from "./services/cardService";
import { processStatusEffects } from "./services/statusEffectService";
import { executeAttack } from "./services/attackService";
import { applySpell, executePlayEffects } from "./services/effectService";
import type { PlayContext } from "./services/effectService";
import type { RuntimeCard, SelectionMode, SelectionConfig, CardUsageType, CardRevealState } from "./types/gameTypes";
import { useToast } from "./hooks/useToast";
import type { ToastItem } from "./hooks/useToast";
import { useActionLog } from "./hooks/useActionLog";
import type { ActionLogEntry } from "./hooks/useActionLog";

export function useGame(): {
  deck: Card[];
  playerHandCards: Card[];
  playerFieldCards: RuntimeCard[];
  playerGraveyard: Card[];
  playerHeroHp: number;
  enemyDeck: Card[];
  enemyHandCards: Card[];
  enemyFieldCards: RuntimeCard[];
  enemyGraveyard: Card[];
  enemyHeroHp: number;
  draggingCard: string | null;
  setDraggingCard: (id: string | null) => void;
  dragPosition: { x: number; y: number };
  setDragPosition: (pos: { x: number; y: number }) => void;
  playerBattleRef: React.RefObject<HTMLDivElement | null>;
  turn: number;
  maxMana: number;
  currentMana: number;
  enemyMaxMana: number;
  enemyCurrentMana: number;
  playCardToField: (card: Card) => void;
  endTurn: () => void;
  attack: (attackerId: string, targetId: string | "hero", isPlayerAttacker?: boolean) => void;
  heal: (targetId: string | "hero", amount: number, isPlayer?: boolean) => void;
  castSpell: (cardUniqueId: string, targetId: string | "hero", isPlayer?: boolean, setAttackTargets?: (targets: string[]) => void) => void;
  turnSecondsRemaining: number;
  aiRunning: boolean;
  movingAttack: { attackerId: string; targetId: string | "hero" } | null;
  playerAttackAnimation: { sourceCardId: string; targetId: string | "hero" } | null;
  enemyAttackAnimation: { sourceCardId: string | null; targetId: string | "hero" } | null;
  enemySpellAnimation: { targetId: string | "hero"; effect: string } | null;
  gameOver: { over: boolean; winner: null | "player" | "enemy" };
  resetGame: (mode: "cpu" | "pvp") => void;
  preGame: boolean;
  coinResult: "deciding" | "player" | "enemy";
  finalizeCoin: (result: "player" | "enemy") => void;
  doMulligan: (keepIds: string[]) => void;
  startMatch: () => void;
  // expose timer instances for UI subscription
  playerTurnTimer: TurnTimer | null;
  enemyTurnTimer: TurnTimer | null;
  setPauseTimer: (pause: boolean) => void;
  destroyingCards: Set<string>;
  // 選択モード
  selectionMode: SelectionMode;
  selectionConfig: SelectionConfig | null;
  initializeSelection: (config: Omit<SelectionConfig, "selectedIds">) => void;
  applySelection: (targetIds: string[]) => void;
  cancelSelection: () => void;
  // トースト通知
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastItem["type"]) => void;
  // AI行動ログ
  actionLogEntries: ActionLogEntry[];
  // カード演出
  cardReveal: CardRevealState | null;
  clearCardReveal: () => void;
} {
  // --- プレイヤー状態 ---
  const [deck, setDeck] = useState<Card[]>([...initialDeck]);
  const [playerHandCards, setPlayerHandCards] = useState<Card[]>([]);
  const [playerFieldCards, setPlayerFieldCards] = useState<RuntimeCard[]>([]);
  const [playerGraveyard, setPlayerGraveyard] = useState<Card[]>([]);
  const [playerHeroHp, setPlayerHeroHp] = useState<number>(MAX_HERO_HP);

  // --- 敵状態 ---
  const [enemyDeck, setEnemyDeck] = useState<Card[]>([...initialDeck]);
  const [enemyHandCards, setEnemyHandCards] = useState<Card[]>([]);
  const [enemyFieldCards, setEnemyFieldCards] = useState<RuntimeCard[]>([]);
  const [enemyGraveyard, setEnemyGraveyard] = useState<Card[]>([]);
  const [enemyHeroHp, setEnemyHeroHp] = useState<number>(MAX_HERO_HP);

  // --- 破壊アニメーション ---
  const [destroyingCards, setDestroyingCards] = useState<Set<string>>(new Set());

  // --- ターン開始処理の重複実行を防ぐ（React Strict Mode の二重マウント対策） ---
  const turnProcessedKeys = useRef<Set<string>>(new Set());

  // --- トースト通知 ---
  const { toasts, showToast } = useToast();
  // --- AI行動ログ ---
  const { entries: actionLogEntries, addLog: addActionLog, clearLog: clearActionLog } = useActionLog();
  // --- カード演出 ---
  const [cardReveal, setCardReveal] = useState<CardRevealState | null>(null);
  const showCardReveal = (card: Card, targetId: string | "hero" | undefined, type: "spell" | "follower") => {
    setCardReveal({ card, targetId, type });
  };
  const clearCardReveal = () => setCardReveal(null);
  // --- 破壊アニメーション管理 ---
  // カードが破壊される時に呼び出す。アニメーション後にフィールドから除外する場合は onAfterAnimation で setter を渡す
  const addCardToDestroying = (cardIds: string[], onAfterAnimation?: (ids: string[]) => void) => {
    if (cardIds.length === 0) return;
    setDestroyingCards((prev) => {
      const next = new Set(prev);
      cardIds.forEach((id) => next.add(id));
      return next;
    });

    const duration = 500;
    setTimeout(() => {
      setDestroyingCards(prev => {
        const next = new Set(prev);
        cardIds.forEach(id => next.delete(id));
        return next;
      });
      onAfterAnimation?.(cardIds);
    }, duration);
  };

  // --- アニメーション中の状態フィルター （破壊カードはアニメーション中でも残す） ---
  const getPlayerFieldCards = () => {
    return playerFieldCards.filter((c) => {
      // 破壊アニメーション中は残す
      if (destroyingCards.has(c.uniqueId)) return true;
      return (c.hp ?? 0) > 0;
    });
  };

  const getEnemyFieldCards = () => {
    return enemyFieldCards.filter((c) => {
      // 破壊アニメーション中は残す
      if (destroyingCards.has(c.uniqueId)) return true;
      return (c.hp ?? 0) > 0;
    });
  };

  // --- DnD ---
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerBattleRef = useRef<HTMLDivElement>(null);
  // Refs to hold latest field arrays so async callers (AI) can read current values
  const playerFieldRef = useRef<RuntimeCard[]>([]);
  const enemyFieldRef = useRef<RuntimeCard[]>([]);
  const enemyHandCardsRef = useRef<Card[]>([]);
  const enemyDeckRef = useRef<Card[]>([]);
  const enemyGraveyardRef = useRef<Card[]>([]);
  const playerHandCardsRef = useRef<Card[]>([]);
  const playerGraveyardRef = useRef<Card[]>([]);
  const enemyFieldCardsRef = useRef<RuntimeCard[]>([]);
  const enemyCurrentManaRef = useRef<number>(1);
  const enemyHeroHpRef = useRef<number>(MAX_HERO_HP);
  const playerFieldCardsRef = useRef<RuntimeCard[]>([]);
  const playerHeroHpRef = useRef<number>(MAX_HERO_HP);

  // --- マナ・ターン ---
  const [turn, setTurn] = useState(1);
  const [maxMana, setMaxMana] = useState(1);
  const [currentMana, setCurrentMana] = useState(1);
  const [enemyMaxMana, setEnemyMaxMana] = useState(1);
  const [enemyCurrentMana, setEnemyCurrentMana] = useState(1);
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<number>(60);
  // TurnTimer を使用して正確な 1 秒カウントを行う（プレイヤー / 敵で別々に管理）
  const playerTurnTimerRef = useRef<TurnTimer | null>(new TurnTimer(60));
  const enemyTurnTimerRef = useRef<TurnTimer | null>(new TurnTimer(60));
  // UI側からタイマーとAIを一時停止するフラグ（ターン開始のモーダル表示など）
  const [pauseTimer, setPauseTimer] = useState<boolean>(false);
  // 初回ターンかどうか（プリゲーム後の最初の turn を特別扱いするためのフラグ）
  const initialTurnRef = useRef<boolean>(false);
  // 最後にマナ増加を適用したラウンド番号（重複適用防止）
  const lastRoundIncreasedRef = useRef<number | null>(null);

  // プレゲーム（先攻決め＋マリガン）フラグとコイン結果
  // start in pre-game state so that timers and turn logic are paused
  const [preGame, setPreGame] = useState<boolean>(true);
  const [coinResult, setCoinResult] = useState<"deciding" | "player" | "enemy">("deciding");

  // ゲーム終了フラグと勝者
  const [gameOver, setGameOver] = useState<{ over: boolean; winner: null | "player" | "enemy" }>({ over: false, winner: null });

  // 敵AI実行中フラグ（再入防止）
  const [aiRunning, setAiRunning] = useState<boolean>(false);

  // 敵AI の途中中断用フラグ
  const aiCancelRef = useRef<boolean>(false);

  // --- 選択モード （ターゲット選択、手札選択など） ---
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
  const [selectionConfig, setSelectionConfig] = useState<SelectionConfig | null>(null);

  const initializeSelection = (config: Omit<SelectionConfig, "selectedIds">) => {
    setSelectionMode(config.selectableTargets.includes("hand_card") ? "select_hand_card" : "select_target");
    setSelectionConfig({
      ...config,
      selectedIds: [],
    });
  };

  const applySelection = (targetIds: string[]) => {
    if (!selectionConfig) return;
    setSelectionMode("none");
    setSelectionConfig(null);
    selectionConfig.onComplete?.(targetIds);
  };

  const cancelSelection = () => {
    if (!selectionConfig) return;
    setSelectionMode("none");
    setSelectionConfig(null);
    selectionConfig.onCancel?.();
  };

  // 視覚用：AIが攻撃を行うときの移動表示を通知する
  const [movingAttack, setMovingAttack] = useState<{ attackerId: string; targetId: string | "hero" } | null>(null);
  
  // プレイヤーが攻撃するときのアニメーション（プレイヤー→敵）
  const [playerAttackAnimation, setPlayerAttackAnimation] = useState<{ sourceCardId: string; targetId: string | "hero" } | null>(null);
  // 敵の攻撃アニメーション用（敵がプレイヤーを攻撃する場合）
  const [enemyAttackAnimation, setEnemyAttackAnimation] = useState<{ sourceCardId: string | null; targetId: string | "hero" } | null>(null);
  // 敵のスペル使用アニメーション用
  const [enemySpellAnimation, setEnemySpellAnimation] = useState<{ targetId: string | "hero"; effect: string } | null>(null);

  // --- 初期手札 ---
  const initializedRef = useRef<boolean>(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const playerDrawResult = drawInitialHand(deck, 5);
    const enemyDrawResult = drawInitialHand(enemyDeck, 5);
    const initialPlayerHand = playerDrawResult.hand.map((c) => ({ ...c, uniqueId: uuidv4() }));
    const initialEnemyHand = enemyDrawResult.hand.map((c) => ({ ...c, uniqueId: uuidv4() }));
    setPlayerHandCards(initialPlayerHand);
    setEnemyHandCards(initialEnemyHand);
    setDeck(playerDrawResult.remaining);
    setEnemyDeck(enemyDrawResult.remaining);

    // preload all card images once so browser cache holds them and display becomes instantaneous
    cards.forEach((c) => {
      if (c.image) {
        const img = new Image();
        img.src = c.image;
      }
    });
  }, []);

  const gameSessionRef = useRef(0);

  // --- ターン開始 ---（ポップアップ表示中でもマナ・ドローを先に反映するため pauseTimer で止めない）
  useEffect(() => {
    if (preGame) return;
    const key = `${gameSessionRef.current}-${turn}`;
    if (turnProcessedKeys.current.has(key)) return;
    turnProcessedKeys.current.add(key);

    // 1) canAttack リセット
    setPlayerFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: false, rushInitialTurn: undefined })));
    setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: false, rushInitialTurn: undefined })));

    // 2) アクティブ側の canAttack 復元
    if (turn % 2 === 1) {
      setPlayerFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
    } else {
      setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
    }

    // 3) 状態効果（毒ダメージ + 凍結デクリメント）
    //    凍結中のカードは canAttack: false に上書きされるため、2) の後に実行する
    setPlayerFieldCards((prev) => {
      const result = processStatusEffects(prev);
      if (result.dead.length > 0) {
        const deadIds = result.dead.map(d => d.uniqueId);
        setPlayerGraveyard((g) => [...g, ...result.dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
        addCardToDestroying(deadIds, (ids) => {
          setPlayerFieldCards((list) => list.filter((c) => !ids.includes(c.uniqueId)));
        });
      }
      return result.updated;
    });

    setEnemyFieldCards((prev) => {
      const result = processStatusEffects(prev);
      if (result.dead.length > 0) {
        const deadIds = result.dead.map(d => d.uniqueId);
        setEnemyGraveyard((g) => [...g, ...result.dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
        addCardToDestroying(deadIds, (ids) => {
          setEnemyFieldCards((list) => list.filter((c) => !ids.includes(c.uniqueId)));
        });
      }
      return result.updated;
    });

    // マナ増加
    if (turn >= 3) {
      if (turn % 2 === 1) {
        if (coinResult === "player") setMaxMana((prevMax) => Math.min(prevMax + 1, MAX_MANA));
        else setEnemyMaxMana((prevMax) => Math.min(prevMax + 1, MAX_MANA));
      } else {
        if (coinResult === "player") setEnemyMaxMana((prevMax) => Math.min(prevMax + 1, MAX_MANA));
        else setMaxMana((prevMax) => Math.min(prevMax + 1, MAX_MANA));
      }
    }
  }, [turn, preGame, coinResult]);

  // ドローはポップアップが閉まった後に1回だけ実行（同じターンで二重ドロー・二重カードを防ぐため ref でガード）
  const lastTurnDrawnRef = useRef<number | null>(null);
  const drewCardForTurnRef = useRef<number | null>(null);

  useEffect(() => {
    if (preGame || pauseTimer) return;
    if (lastTurnDrawnRef.current === turn) return;
    lastTurnDrawnRef.current = turn;

    if (turn % 2 === 1) {
      setDeck((prev) => {
        if (prev.length === 0) return prev;
        if (drewCardForTurnRef.current === turn) return prev.slice(1);
        drewCardForTurnRef.current = turn;
        const card = createUniqueCard(prev[0]);
        setPlayerHandCards((h) => {
          if (h.length >= MAX_HAND) {
            setPlayerGraveyard((g) => [...g, card]);
            return h;
          }
          return [...h, card];
        });
        return prev.slice(1);
      });
    } else {
      setEnemyDeck((prev) => {
        if (prev.length === 0) return prev;
        if (drewCardForTurnRef.current === turn) return prev.slice(1);
        drewCardForTurnRef.current = turn;
        const card = createUniqueCard(prev[0]);
        setEnemyHandCards((h) => {
          if (h.length >= MAX_HAND) {
            setEnemyGraveyard((g) => [...g, card]);
            return h;
          }
          return [...h, card];
        });
        return prev.slice(1);
      });
    }
  }, [turn, preGame, pauseTimer]);

  // マナを現在マナに同期（ターン開始時に実行）
  const maxManaRef = useRef<number>(maxMana);
  const enemyMaxManaRef = useRef<number>(enemyMaxMana);
  useEffect(() => {
    maxManaRef.current = maxMana;
  }, [maxMana]);
  useEffect(() => {
    enemyMaxManaRef.current = enemyMaxMana;
  }, [enemyMaxMana]);

  useEffect(() => {
    if (preGame) return;
    const isPlayerTurn = turn % 2 === 1;
    if (isPlayerTurn) {
      setCurrentMana(Math.min(maxManaRef.current, MAX_MANA));
    } else {
      setEnemyCurrentMana(Math.min(enemyMaxManaRef.current, MAX_MANA));
    }
  }, [turn, preGame, maxMana, enemyMaxMana]);

  // ターン変更時のリセット・イベント登録（プレイヤー/敵で独立）
  const modalPauseRef = useRef<boolean>(false);
  const turnRef = useRef<number>(turn);
  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    if (preGame) return;

    // ターン切替用モーダルを表示している間は必ずタイマーを一時停止する
    modalPauseRef.current = true;
    setPauseTimer(true);
    const modalDuration = (turn % 2 === 1) ? 2000 : 1200;
    const modalTimer = setTimeout(() => {
      if (modalPauseRef.current) {
        modalPauseRef.current = false;
        setPauseTimer(false);
      }
    }, modalDuration);

    // 両タイマーをリセット
    playerTurnTimerRef.current?.setDuration(TURN_DURATION_SECONDS);
    playerTurnTimerRef.current?.reset();
    enemyTurnTimerRef.current?.setDuration(TURN_DURATION_SECONDS);
    enemyTurnTimerRef.current?.reset();

    // 現在のターン側の残りを表示
    const activeRemaining = (turn % 2 === 1 ? playerTurnTimerRef.current?.getRemaining() : enemyTurnTimerRef.current?.getRemaining()) ?? TURN_DURATION_SECONDS;
    setTurnSecondsRemaining(activeRemaining);

    const playerTick = (remaining: number) => {
      if (turnRef.current % 2 === 1) {
        setTurnSecondsRemaining(remaining);
        console.debug(`[Timer][player] turn=${turnRef.current} secondsRemaining -> ${remaining}`);
      }
    };
    const enemyTick = (remaining: number) => {
      if (turnRef.current % 2 === 0) {
        setTurnSecondsRemaining(remaining);
        console.debug(`[Timer][enemy] turn=${turnRef.current} secondsRemaining -> ${remaining}`);
      }
    };

    const playerEnd = () => {
      console.debug(`[Timer][player] timeup on turn=${turnRef.current}, calling endTurn()`);
      setTurn((t) => t + 1);
    };
    const enemyEnd = () => {
      console.debug(`[Timer][enemy] timeup on turn=${turnRef.current}, calling endTurn()`);
      setTurn((t) => t + 1);
    };

    const offPlayerTick = playerTurnTimerRef.current?.onTick(playerTick);
    const offPlayerEnd = playerTurnTimerRef.current?.onEnd(playerEnd);
    const offEnemyTick = enemyTurnTimerRef.current?.onTick(enemyTick);
    const offEnemyEnd = enemyTurnTimerRef.current?.onEnd(enemyEnd);

    // モーダル終了後にタイマーを開始
    const startTimerTimeout = setTimeout(() => {
      // pauseTimerがfalseになったことを確認してからタイマーを開始
      if (!modalPauseRef.current) {
        if (turnRef.current % 2 === 1) {
          playerTurnTimerRef.current?.start();
        } else {
          enemyTurnTimerRef.current?.start();
        }
      }
    }, modalDuration);

    return () => {
      clearTimeout(modalTimer);
      clearTimeout(startTimerTimeout);
      modalPauseRef.current = false;
      if (offPlayerTick) offPlayerTick();
      if (offPlayerEnd) offPlayerEnd();
      if (offEnemyTick) offEnemyTick();
      if (offEnemyEnd) offEnemyEnd();
      // 一時停止（両方）
      playerTurnTimerRef.current?.pause();
      enemyTurnTimerRef.current?.pause();
    };
  }, [turn, preGame]);

  // UI の一時停止要求に応じて pause/resume を行う（モーダル表示中など）
  useEffect(() => {
    if (preGame) return;
    if (pauseTimer) {
      playerTurnTimerRef.current?.pause();
      enemyTurnTimerRef.current?.pause();
    } else {
      const p = playerTurnTimerRef.current;
      const e = enemyTurnTimerRef.current;
      // 再開は現在ターン側のみ
      if (turn % 2 === 1) {
        if (p && !p.isRunning() && p.getRemaining() > 0) p.start();
      } else {
        if (e && !e.isRunning() && e.getRemaining() > 0) e.start();
      }
    }
  }, [pauseTimer, turn, preGame]);

  // --- 敵AI: 簡易ターン処理 ---
  useEffect(() => {
    // プリゲーム中は AI を動かさない
    if (preGame) return;
    // モーダルや pause の間は敵の行動を開始しない（ポップアップ終了後に開始）
    let enemyAiTimer: ReturnType<typeof setTimeout> | null = null;
    if (turn > 1 && turn % 2 === 0 && !aiRunning && !pauseTimer) {
      const scheduledTurn = turn;
      // 1000ms の追加遅延を挟む（モーダル終了後にすぐ行動を開始しない）
      enemyAiTimer = setTimeout(() => {
        if (preGame) return;
        if (pauseTimer) return;
        if (aiCancelRef.current) return;
        // ターンが変わっていたらキャンセル
        if (turn !== scheduledTurn) return;
        if (!aiRunning) {
          const aiCtx: AIGameContext = {
            enemyDeck: enemyDeckRef.current,
            enemyHandCards: enemyHandCardsRef.current,
            enemyGraveyard: enemyGraveyardRef.current,
            enemyFieldCards: enemyFieldCardsRef.current,
            enemyCurrentMana: enemyCurrentManaRef.current,
            enemyHeroHp: enemyHeroHpRef.current,
            playerFieldCards: playerFieldCardsRef.current,
            playerHeroHp: playerHeroHpRef.current,
            playerHandCards: playerHandCardsRef.current,
            playerGraveyard: playerGraveyardRef.current,
            setEnemyDeck,
            setEnemyHandCards,
            setEnemyFieldCards,
            setEnemyCurrentMana,
            setEnemyHeroHp,
            setEnemyGraveyard,
            setPlayerHandCards,
            setPlayerFieldCards,
            setPlayerHeroHp,
            setPlayerGraveyard,
            setPlayerDeck: setDeck,
            setGameOver,
            setAiRunning,
            setMovingAttack,
            setEnemyAttackAnimation,
            setEnemySpellAnimation,
            attack,
            endTurn,
            stopTimer: () => { enemyTurnTimerRef.current?.stop(); },
            drawPlayerCard,
            drawEnemyCard,
            drawPlayerCards,
            drawEnemyCards,
            addCardToDestroying,
            cancelRef: aiCancelRef,
            addActionLog,
            showCardReveal,
            clearCardReveal,
          };
          runEnemyTurn(aiCtx);
        }
      }, 1000);
    }

    return () => {
      if (enemyAiTimer) clearTimeout(enemyAiTimer);
    };
  }, [turn, aiRunning, preGame, pauseTimer]);

  // keep refs in sync with state so async callers (AI, logs) can read latest
  useEffect(() => {
    playerFieldRef.current = playerFieldCards;
    playerFieldCardsRef.current = playerFieldCards;
  }, [playerFieldCards]);
  useEffect(() => {
    enemyFieldRef.current = enemyFieldCards;
    enemyFieldCardsRef.current = enemyFieldCards;
  }, [enemyFieldCards]);
  useEffect(() => {
    enemyHandCardsRef.current = enemyHandCards;
    enemyDeckRef.current = enemyDeck;
    enemyGraveyardRef.current = enemyGraveyard;
    playerHandCardsRef.current = playerHandCards;
    playerGraveyardRef.current = playerGraveyard;
  }, [enemyHandCards, enemyDeck, enemyGraveyard, playerHandCards, playerGraveyard]);
  useEffect(() => {
    enemyCurrentManaRef.current = enemyCurrentMana;
  }, [enemyCurrentMana]);
  useEffect(() => {
    enemyHeroHpRef.current = enemyHeroHp;
  }, [enemyHeroHp]);
  useEffect(() => {
    playerHeroHpRef.current = playerHeroHp;
  }, [playerHeroHp]);

  // ゲーム終了時の完全停止: タイマーをクリアし、AI を中断・停止する
  useEffect(() => {
    if (!gameOver.over) return;
    // stop both timers
    try { playerTurnTimerRef.current?.stop(); enemyTurnTimerRef.current?.stop(); } catch (e) { /* ignore */ }
    // cancel running AI and prevent new AI start
    aiCancelRef.current = true;
    setAiRunning(false);
    console.debug("[Game] gameOver -> cleared timers and cancelled AI");
  }, [gameOver]);

  // --- ドロー（setter 内で最新 state を参照し、stale closure を回避） ---
  const drawPlayerCard = () => {
    setDeck((prev) => {
      if (prev.length === 0) return prev;
      const card = createUniqueCard(prev[0]);
      setPlayerHandCards((h) => {
        if (h.length >= MAX_HAND) {
          setPlayerGraveyard((g) => [...g, card]);
          return h;
        }
        return [...h, card];
      });
      return prev.slice(1);
    });
  };

  const drawEnemyCard = () => {
    setEnemyDeck((prev) => {
      if (prev.length === 0) return prev;
      const card = createUniqueCard(prev[0]);
      setEnemyHandCards((h) => {
        if (h.length >= MAX_HAND) {
          setEnemyGraveyard((g) => [...g, card]);
          return h;
        }
        return [...h, card];
      });
      return prev.slice(1);
    });
  };

  const drawPlayerCards = (count: number) => {
    // 複数のプレイヤーカードを一度にドロー
    setDeck((prev) => {
      const cards: Card[] = [];
      let remaining = [...prev];
      for (let i = 0; i < count && remaining.length > 0; i++) {
        cards.push(createUniqueCard(remaining[0]));
        remaining = remaining.slice(1);
      }
      setPlayerHandCards((h) => {
        const newHand = [...h];
        for (const card of cards) {
          if (newHand.length < MAX_HAND) {
            newHand.push(card);
          }
        }
        return newHand;
      });
      return remaining;
    });
  };

  const drawEnemyCards = (count: number) => {
    // 複数の敵カードを一度にドロー
    setEnemyDeck((prev) => {
      const cards: Card[] = [];
      let remaining = [...prev];
      for (let i = 0; i < count && remaining.length > 0; i++) {
        cards.push(createUniqueCard(remaining[0]));
        remaining = remaining.slice(1);
      }
      setEnemyHandCards((h) => {
        const newHand = [...h];
        for (const card of cards) {
          if (newHand.length < MAX_HAND) {
            newHand.push(card);
          }
        }
        return newHand;
      });
      return remaining;
    });
  };

  // --- ターン終了 ---
  const endTurn = () => {
    console.debug(`[Game] endTurn called (current turn=${turn})`);

    // end_turn_add_card トリガー: フィールド上の該当カード毎にカードを手札に加える
    const isPlayerTurn = turn % 2 === 1;
    const fieldRef = isPlayerTurn ? playerFieldCardsRef.current : enemyFieldCardsRef.current;
    const setHand = isPlayerTurn ? setPlayerHandCards : setEnemyHandCards;
    const setGrave = isPlayerTurn ? setPlayerGraveyard : setEnemyGraveyard;

    for (const fc of fieldRef) {
      if (fc.summonTrigger?.type === "end_turn_add_card" && fc.summonTrigger.cardIds) {
        for (const cid of fc.summonTrigger.cardIds) {
          const base = cards.find((c) => c.id === cid);
          if (base) {
            const newCard = { ...base, uniqueId: uuidv4() };
            addCardToHand(newCard, setHand, setGrave);
          }
        }
      }
    }

    setTurn((t) => t + 1);
  };

  // --- ゲームリセット（新しい対戦を開始） ---
  const resetGame = (mode: "cpu" | "pvp" = "cpu") => {
    // 既存のタイマーをクリア
    try { playerTurnTimerRef.current?.stop(); enemyTurnTimerRef.current?.stop(); } catch (e) { /* ignore */ }
    setAiRunning(false);
    setMovingAttack(null);
    // 敵AI 中断フラグを立てる
    aiCancelRef.current = true;
    initializedRef.current = false;

    // 状態をリセット。デッキ/手札はコイントス後にセットする
    setDeck([]);
    setEnemyDeck([]);
    setPlayerHandCards([]);
    setEnemyHandCards([]);
    setPlayerFieldCards([]);
    setEnemyFieldCards([]);
    setPlayerGraveyard([]);
    setEnemyGraveyard([]);
    setPlayerHeroHp(MAX_HERO_HP);
    setEnemyHeroHp(MAX_HERO_HP);
    setTurn(1);
    setMaxMana(1);
    setCurrentMana(1);
    setEnemyMaxMana(1);
    setEnemyCurrentMana(1);
    setTurnSecondsRemaining(TURN_DURATION_SECONDS);
    playerTurnTimerRef.current?.setDuration(TURN_DURATION_SECONDS);
    playerTurnTimerRef.current?.reset();
    enemyTurnTimerRef.current?.setDuration(TURN_DURATION_SECONDS);
    enemyTurnTimerRef.current?.reset();
    setGameOver({ over: false, winner: null });
    // プリゲーム（先攻/後攻決めとマリガン）を開始
    setPreGame(true);
    setCoinResult("deciding");
    // 初回ターンは特別扱い（プリゲーム直後の最初のターンはマナ増加を行わない）
    initialTurnRef.current = true;
    lastRoundIncreasedRef.current = null;
    gameSessionRef.current += 1;
    turnProcessedKeys.current.clear();
    lastTurnDrawnRef.current = null;
    drewCardForTurnRef.current = null;
  };

  // コイントスの結果確定（'player' が先攻、'enemy' が後攻）
  const finalizeCoin = (winner: "player" | "enemy") => {
    setCoinResult(winner);
    const playerRole = winner === "player" ? "king" : "usurper";
    const enemyRole = playerRole === "king" ? "usurper" : "king";

    const playerFullDeck = createDeck(playerRole);
    const enemyFullDeck = createDeck(enemyRole);
    const playerDrawResult = drawInitialHand(playerFullDeck, 5);
    const enemyDrawResult = drawInitialHand(enemyFullDeck, 5);
    const playerHand = playerDrawResult.hand.map((c) => ({ ...c, uniqueId: uuidv4() }));
    const enemyHand = enemyDrawResult.hand.map((c) => ({ ...c, uniqueId: uuidv4() }));

    setDeck(playerDrawResult.remaining);
    setEnemyDeck(enemyDrawResult.remaining);
    setPlayerHandCards(playerHand);
    setEnemyHandCards(enemyHand);

    if (winner === "player") setTurn(1);
    else setTurn(2);
  };

  // マリガン: 指定したユニークIDのカード群をデッキに戻してドローし直す
  const doMulligan = (keepIds: string[], onDone?: () => void) => {
    // 手札を kept と replacement に分ける
    const kept = playerHandCards.filter(c => keepIds.includes(c.uniqueId));
    const toReturn = playerHandCards.filter(c => !keepIds.includes(c.uniqueId));
    // 返却したカードをデッキに戻してシャッフル（単純に末尾に追加してシャッフル）
    let newDeck = [...deck, ...toReturn.map(c => ({ ...c, uniqueId: uuidv4() }))];
    // ランダムシャッフル
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    // 新しい手札を補充して最終手札を set
    const drawCount = 5 - kept.length;
    const newHand = [...kept];
    for (let i = 0; i < drawCount && newDeck.length > 0; i++) {
      const card = { ...newDeck[0], uniqueId: uuidv4() };
      newHand.push(card);
      newDeck = newDeck.slice(1);
    }
    setDeck(newDeck);
    setPlayerHandCards(newHand);
  };

  // プリゲームを終了して実際のマッチを始める
  const startMatch = () => {
    // プリゲームフラグを解除してターン処理を開始する
    // マナのリセットはターン開始処理（useEffect）に任せる
    setPreGame(false);
    lastRoundIncreasedRef.current = null;
    // AI 中断フラグをクリア（新しいマッチで AI を許可）
    aiCancelRef.current = false;
  };

  // --- 手札 → フィールド ---
  const buildPlayContext = (): PlayContext => ({
    playerFieldCards: playerFieldCardsRef.current,
    enemyFieldCards: enemyFieldCardsRef.current,
    setPlayerFieldCards,
    setEnemyFieldCards,
    playerHandCards: playerHandCardsRef.current,
    enemyHandCards: enemyHandCardsRef.current,
    setPlayerHandCards,
    setEnemyHandCards,
    playerGraveyard: playerGraveyardRef.current,
    enemyGraveyard: enemyGraveyardRef.current,
    setPlayerGraveyard,
    setEnemyGraveyard,
    setPlayerHeroHp,
    setEnemyHeroHp,
    setGameOver,
    stopTimer: () => {
      try { playerTurnTimerRef.current?.stop(); enemyTurnTimerRef.current?.stop(); } catch (_) {}
    },
    setAiRunning,
    addCardToDestroying,
    setDeck,
    setEnemyDeck,
    currentMana,
    setCurrentMana,
    enemyCurrentMana,
    setEnemyCurrentMana,
    drawPlayerCard,
    drawEnemyCard,
    drawPlayerCards,
    drawEnemyCards,
  });

  const playCardToField = (card: Card, selectedTargetIds?: string[]) => {
    if (card.type === "spell") {
      showToast("スペルはフィールドに出せません。ターゲットにドロップして使用してください。");
      return;
    }
    if (playerFieldCards.length >= MAX_FIELD_SIZE) {
      showToast("フィールドは最大5体までです。");
      return;
    }
    if (card.cost > currentMana) {
      showToast("マナが足りません！");
      return;
    }
    setCurrentMana((m) => m - card.cost);

    const canAttack = !!(card.rush || card.superHaste);
    const fieldCard = createFieldCard(card, canAttack);
    setPlayerFieldCards((f) => [...f, fieldCard]);
    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));

    setTimeout(() => {
      setPlayerFieldCards((list) => list.map((c) => (c.uniqueId === card.uniqueId ? { ...c, isAnimating: false } : c)));
    }, 600);

    const ctx = buildPlayContext();

    if (card.summonEffect) {
      const se = card.summonEffect;
      if (se.type === "damage_all" && (se.value ?? 0) > 0) {
        const dmg = se.value ?? 1;
        setEnemyFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) {
            setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
            addCardToDestroying(dead.map((d) => d.uniqueId));
          }
          return updated;
        });
      } else if (se.type === "damage_single" && (se.value ?? 0) > 0) {
        const dmg = se.value ?? 1;
        const target = selectedTargetIds?.[0];
        if (target === "hero") {
          setEnemyHeroHp((h) => {
            const next = Math.max(h - dmg, 0);
            if (next <= 0) { setGameOver({ over: true, winner: "player" }); ctx.stopTimer(); setAiRunning(false); }
            return next;
          });
        } else if (target) {
          setEnemyFieldCards((list) => {
            const updated = list.map((c) => (c.uniqueId === target ? { ...c, hp: (c.hp ?? 0) - dmg } : c));
            const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
            if (dead.length) {
              setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
              addCardToDestroying(dead.map((d) => d.uniqueId));
            }
            return updated.filter((c) => (c.hp ?? 0) > 0);
          });
        }
      }
    }

    if (card.summonTrigger?.type === "add_card_hand" && card.summonTrigger.cardId) {
      const base = cards.find((c) => c.id === card.summonTrigger!.cardId);
      if (base) {
        const newCard = { ...base, uniqueId: uuidv4() };
        setPlayerHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
      }
    }

    executePlayEffects(card, true, ctx, selectedTargetIds);
  };

  // --- HP回復 ---
  const heal = (targetId: string | "hero", amount: number, isPlayer: boolean = true) => {
    if (targetId === "hero") {
      if (isPlayer) setPlayerHeroHp((hp) => Math.min(hp + amount, MAX_HERO_HP));
      else setEnemyHeroHp((hp) => Math.min(hp + amount, MAX_HERO_HP));
    } else {
      const list = isPlayer ? playerFieldCards : enemyFieldCards;
      const setter = isPlayer ? setPlayerFieldCards : setEnemyFieldCards;
      setter(
        list.map((c) => (c.uniqueId === targetId ? { ...c, hp: Math.min((c.hp ?? 0) + amount, c.maxHp) } : c))
      );
    }
  };

  // --- 攻撃処理 ---
  const attack = (
    attackerId: string,
    targetId: string | "hero",
    isPlayerAttacker: boolean = true
  ) => {
    if (isPlayerAttacker) {
      setPlayerAttackAnimation({ sourceCardId: attackerId, targetId });
      setTimeout(() => setPlayerAttackAnimation(null), 1000);
    } else {
      setEnemyAttackAnimation({ sourceCardId: attackerId, targetId });
      setTimeout(() => setEnemyAttackAnimation(null), 1000);
    }

    executeAttack(attackerId, targetId, {
      attackerList: isPlayerAttacker ? playerFieldRef.current : enemyFieldRef.current,
      targetList: isPlayerAttacker ? enemyFieldRef.current : playerFieldRef.current,
      setAttackerList: isPlayerAttacker ? setPlayerFieldCards : setEnemyFieldCards,
      setTargetList: isPlayerAttacker ? setEnemyFieldCards : setPlayerFieldCards,
      setTargetHeroHp: isPlayerAttacker ? setEnemyHeroHp : setPlayerHeroHp,
      setAttackerGraveyard: isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard,
      setTargetGraveyard: isPlayerAttacker ? setEnemyGraveyard : setPlayerGraveyard,
      setAttackerHandCards: isPlayerAttacker ? setPlayerHandCards : setEnemyHandCards,
      setTargetHandCards: isPlayerAttacker ? setEnemyHandCards : setPlayerHandCards,
      setGameOver,
      stopTimer: () => {
        try { playerTurnTimerRef.current?.stop(); enemyTurnTimerRef.current?.stop(); } catch (e) { /* ignore */ }
      },
      setAiRunning,
      isPlayerAttacker,
    }, addCardToDestroying);
  };

  // --- スペルの発動 ---
  const castSpell = (cardUniqueId: string, targetId: string | "hero", isPlayer: boolean = true, setAttackTargets?: (targets: string[]) => void) => {
    // プレイヤーか敵かの手札からカードを探す
    const card = isPlayer 
      ? playerHandCards.find((c) => c.uniqueId === cardUniqueId) 
      : enemyHandCards.find((c) => c.uniqueId === cardUniqueId);
    if (!card || card.type !== "spell") return;

    // マナチェック
    const currentManaToUse = isPlayer ? currentMana : enemyCurrentMana;
    if (card.cost > currentManaToUse) {
      if (isPlayer) showToast("マナが足りません（spell）");
      return;
    }

    // マナ消費
    if (isPlayer) {
      setCurrentMana((m) => m - card.cost);
    } else {
      setEnemyCurrentMana((m) => m - card.cost);
    }

    // ref から最新の state を渡して stale closure を回避
    applySpell(card, targetId, isPlayer, {
      playerFieldCards: playerFieldCardsRef.current,
      enemyFieldCards: enemyFieldCardsRef.current,
      setPlayerFieldCards,
      setEnemyFieldCards,
      setPlayerHeroHp,
      setEnemyHeroHp,
      setPlayerGraveyard,
      setEnemyGraveyard,
      setGameOver,
      stopTimer: () => {
        try { playerTurnTimerRef.current?.stop(); enemyTurnTimerRef.current?.stop(); } catch (e) { /* ignore */ }
      },
      setAiRunning,
      addCardToDestroying,
      playerHandCards: playerHandCardsRef.current,
      enemyHandCards: enemyHandCardsRef.current,
      setPlayerHandCards,
      setEnemyHandCards,
      playerGraveyard: playerGraveyardRef.current,
      enemyGraveyard: enemyGraveyardRef.current,
      setDeck,
      setEnemyDeck,
      currentMana,
      setCurrentMana,
      enemyCurrentMana,
      setEnemyCurrentMana,
      drawPlayerCard,
      drawEnemyCard,
      drawPlayerCards,
      drawEnemyCards,
    });

    // 手札から除去して墓地へ
    if (isPlayer) {
      setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
      setPlayerGraveyard((g) => [...g, createUniqueCard(card)]);
    } else {
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
      setEnemyGraveyard((g) => [...g, createUniqueCard(card)]);
      // 敵がスペルを使ったら視覚的に見えるようにアニメーションをトリガー
      setEnemySpellAnimation({ targetId, effect: card.effect || "" });
      setTimeout(() => setEnemySpellAnimation(null), 600);
    }

    // ハイライト解除
    setAttackTargets?.([]);
  };

  return {
    deck,
    playerHandCards,
    playerFieldCards: getPlayerFieldCards(),
    playerGraveyard,
    playerHeroHp,
    enemyDeck,
    enemyHandCards,
    enemyFieldCards: getEnemyFieldCards(),
    enemyGraveyard,
    enemyHeroHp,
    draggingCard,
    setDraggingCard,
    dragPosition,
    setDragPosition,
    playerBattleRef,
    turn,
    maxMana,
    currentMana,
    enemyMaxMana,
    enemyCurrentMana,
    playCardToField,
    endTurn,
    attack,
    heal,
    castSpell,
    turnSecondsRemaining,
    aiRunning,
    movingAttack,
    playerAttackAnimation,
    enemyAttackAnimation,
    enemySpellAnimation,
    gameOver,
    resetGame,
    // pre-game (coin/mulligan)
    preGame,
    coinResult,
    finalizeCoin,
    doMulligan,
    startMatch,
    // expose the timer instances so UI can subscribe
    playerTurnTimer: playerTurnTimerRef.current,
    enemyTurnTimer: enemyTurnTimerRef.current,
    setPauseTimer,
    destroyingCards,
    // 選択モード
    selectionMode,
    selectionConfig,
    initializeSelection,
    applySelection,
    cancelSelection,
    // トースト通知
    toasts,
    showToast,
    // AI行動ログ
    actionLogEntries,
    // カード演出
    cardReveal,
    clearCardReveal,
  };
}

export default useGame;