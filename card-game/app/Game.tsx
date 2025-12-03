// Game.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "./data/cards";
import { cards } from "./data/cards";
import { deck as initialDeck, drawInitialHand } from "./data/game";
import { createDeck } from "./data/deck";
import { startEnemyTurn, runEnemyTurn } from "./data/enemyAI";

const MAX_HAND = 10;
const MAX_MANA = 10;
const MAX_HERO_HP = 20;

export function useGame(): {
  deck: Card[];
  playerHandCards: Card[];
  playerFieldCards: (Card & { maxHp: number; canAttack?: boolean })[];
  playerGraveyard: Card[];
  playerHeroHp: number;
  enemyDeck: Card[];
  enemyHandCards: Card[];
  enemyFieldCards: (Card & { maxHp: number; canAttack?: boolean })[];
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
  castSpell: (cardUniqueId: string, targetId: string | "hero", isPlayer?: boolean) => void;
  turnSecondsRemaining: number;
  aiRunning: boolean;
  movingAttack: { attackerId: string; targetId: string | "hero" } | null;
  enemyAttackAnimation: { sourceCardId: string | null; targetId: string | "hero" } | null;
  enemySpellAnimation: { targetId: string | "hero"; effect: string } | null;
  gameOver: { over: boolean; winner: null | "player" | "enemy" };
  resetGame: (mode: "cpu" | "pvp") => void;
  preGame: boolean;
  coinResult: "deciding" | "player" | "enemy";
  finalizeCoin: (result: "player" | "enemy") => void;
  doMulligan: (keepIds: string[]) => void;
  startMatch: () => void;
} {
  // --- プレイヤー状態 ---
  const [deck, setDeck] = useState<Card[]>([...initialDeck]);
  const [playerHandCards, setPlayerHandCards] = useState<Card[]>([]);
  const [playerFieldCards, setPlayerFieldCards] = useState<(Card & { maxHp: number; canAttack?: boolean })[]>([]);
  const [playerGraveyard, setPlayerGraveyard] = useState<Card[]>([]);
  const [playerHeroHp, setPlayerHeroHp] = useState<number>(MAX_HERO_HP);

  // --- 敵状態 ---
  const [enemyDeck, setEnemyDeck] = useState<Card[]>([...initialDeck]);
  const [enemyHandCards, setEnemyHandCards] = useState<Card[]>([]);
  const [enemyFieldCards, setEnemyFieldCards] = useState<(Card & { maxHp: number; canAttack?: boolean })[]>([]);
  const [enemyGraveyard, setEnemyGraveyard] = useState<Card[]>([]);
  const [enemyHeroHp, setEnemyHeroHp] = useState<number>(MAX_HERO_HP);

  // --- DnD ---
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerBattleRef = useRef<HTMLDivElement>(null);
  // Refs to hold latest field arrays so async callers (AI) can read current values
  const playerFieldRef = useRef<(Card & { maxHp: number; canAttack?: boolean })[]>([]);
  const enemyFieldRef = useRef<(Card & { maxHp: number; canAttack?: boolean })[]>([]);

  // --- マナ・ターン ---
  const [turn, setTurn] = useState(1);
  const [maxMana, setMaxMana] = useState(1);
  const [currentMana, setCurrentMana] = useState(1);
  const [enemyMaxMana, setEnemyMaxMana] = useState(1);
  const [enemyCurrentMana, setEnemyCurrentMana] = useState(1);
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<number>(60);
  const turnTimeoutRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(60);
  // UI側からタイマーとAIを一時停止するフラグ（ターン開始のモーダル表示など）
  const [pauseTimer, setPauseTimer] = useState<boolean>(false);
  // 初回ターンかどうか（プリゲーム後の最初の turn を特別扱いするためのフラグ）
  const initialTurnRef = useRef<boolean>(false);
  // 最後にマナ増加を適用したラウンド番号（重複適用防止）
  const lastRoundIncreasedRef = useRef<number | null>(null);

  // プレゲーム（先攻決め＋マリガン）フラグとコイン結果
  const [preGame, setPreGame] = useState<boolean>(false);
  const [coinResult, setCoinResult] = useState<"deciding" | "player" | "enemy">("deciding");

  // ゲーム終了フラグと勝者
  const [gameOver, setGameOver] = useState<{ over: boolean; winner: null | "player" | "enemy" }>({ over: false, winner: null });

  // 敵AI実行中フラグ（再入防止）
  const [aiRunning, setAiRunning] = useState<boolean>(false);

  // 敵AI の途中中断用フラグ
  const aiCancelRef = useRef<boolean>(false);

  // 視覚用：AIが攻撃を行うときの移動表示を通知する
  const [movingAttack, setMovingAttack] = useState<{ attackerId: string; targetId: string | "hero" } | null>(null);
  
  // 敵の攻撃アニメーション用（敵がプレイヤーを攻撃する場合）
  const [enemyAttackAnimation, setEnemyAttackAnimation] = useState<{ sourceCardId: string | null; targetId: string | "hero" } | null>(null);
  
  // 敵のスペル使用アニメーション用
  const [enemySpellAnimation, setEnemySpellAnimation] = useState<{ targetId: string | "hero"; effect: string } | null>(null);

  // --- 初期手札 ---
  useEffect(() => {
    const initialPlayerHand = drawInitialHand(deck, 5).map((c) => ({ ...c, uniqueId: uuidv4() }));
    const initialEnemyHand = drawInitialHand(enemyDeck, 5).map((c) => ({ ...c, uniqueId: uuidv4() }));
    setPlayerHandCards(initialPlayerHand);
    setEnemyHandCards(initialEnemyHand);
    setDeck((prev) => prev.slice(5));
    setEnemyDeck((prev) => prev.slice(5));
  }, []);

  // --- ターン開始 ---
  useEffect(() => {
    // プリゲーム中はターン開始処理を走らせない
    if (preGame) return;
    // ターン開始時に UI 側が一時停止を要求している場合、マナ増加等の処理は遅延させる
    // 初回ターンのスキップフラグは initialTurnRef
    if (pauseTimer) return;
    // --- 状態効果の処理（ターンごとに毒ダメージや凍結のデクリメントを行う） ---
    // 簡易実装: フィールドの各フォロワーに poison / frozen があれば処理し、死亡したら墓地へ移す
    (function processStatusEffects() {
      // プレイヤーフィールド
      setPlayerFieldCards((prev) => {
        const updated = prev.map((c) => {
          let card = { ...c } as any;
          // 毒ダメージ
          if (card.poison && card.poison > 0) {
            const dmg = card.poisonDamage ?? 1;
            card.hp = (card.hp ?? 0) - dmg;
            card.poison = Math.max(0, card.poison - 1);
          }
          // 凍結ターンをデクリメント
          if (card.frozen && card.frozen > 0) {
            card.frozen = Math.max(0, card.frozen - 1);
            if (card.frozen === 0) card.canAttack = true;
          }
          return card;
        });
        const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
        if (dead.length) setPlayerGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
        return updated.filter((c) => (c.hp ?? 0) > 0);
      });

      // 敵フィールド
      setEnemyFieldCards((prev) => {
        const updated = prev.map((c) => {
          let card = { ...c } as any;
          if (card.poison && card.poison > 0) {
            const dmg = card.poisonDamage ?? 1;
            card.hp = (card.hp ?? 0) - dmg;
            card.poison = Math.max(0, card.poison - 1);
          }
          if (card.frozen && card.frozen > 0) {
            card.frozen = Math.max(0, card.frozen - 1);
            if (card.frozen === 0) card.canAttack = true;
          }
          return card;
        });
        const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
        if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
        return updated.filter((c) => (c.hp ?? 0) > 0);
      });
    })();

    // ターン開始時のマナ増加処理（初回ターンはスキップ）
    const nextTurn = turn + 1;
    if (!initialTurnRef.current) {
      if (nextTurn > 1) {
        const isNextTurnPlayer =
          (coinResult === 'player' && nextTurn % 2 === 1) ||
          (coinResult === 'enemy' && nextTurn % 2 === 0);

        if (isNextTurnPlayer) {
          setMaxMana((prevMax) => Math.min(prevMax + 1, MAX_MANA));
        }

        const isNextTurnEnemy = !isNextTurnPlayer;
        if (isNextTurnEnemy) {
          setEnemyMaxMana((prevMax) => Math.min(prevMax + 1, MAX_MANA));
        }
      }
    } else {
      // 初回ターンフラグをクリアして増加処理を次回以降に任せる
      initialTurnRef.current = false;
    }


    // ターン開始ごとの共通処理：canAttack をリセット
    setPlayerFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: false, rushInitialTurn: undefined })));
    setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: false, rushInitialTurn: undefined })));

    if (turn % 2 === 1) {
      // プレイヤーターン開始
      drawPlayerCard();
      // プレイヤーフィールドのフォロワーが攻撃可能に
      setPlayerFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
      setCurrentMana((_) => Math.min(maxMana, MAX_MANA));
    } else {
      // 敵ターン開始
      drawEnemyCard();
      // 敵フィールドのフォロワーが攻撃可能に
      setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
      setEnemyCurrentMana((_) => Math.min(enemyMaxMana, MAX_MANA));
    }
  }, [turn, preGame]);

  // ターンタイマー（60秒）
  const isPlayerTurn = turn % 2 === 1;

  useEffect(() => {
    // プレゲーム中はタイマーを動かさない（プリゲーム終了で再開）
    if (preGame) return;

    // ターン開始ごとに残り時間をリセット
    remainingRef.current = 60;
    setTurnSecondsRemaining(60);

    // 安全な tick 実装：remainingRef を直接減らし、0 になったら endTurn を呼んで再スケジュールしない
    const tick = () => {
      remainingRef.current -= 1;
      const next = remainingRef.current;
      setTurnSecondsRemaining(next);
      console.debug(`[Timer] turn=${turn} secondsRemaining -> ${next}`);
      if (next <= 0) {
        console.debug(`[Timer] timeup on turn=${turn}, calling endTurn()`);
        endTurn();
        return;
      }
      turnTimeoutRef.current = window.setTimeout(tick, 1000) as unknown as number;
    };

    // 最初の tick を1秒後に開始
    turnTimeoutRef.current = window.setTimeout(tick, 1000) as unknown as number;

    return () => {
      if (turnTimeoutRef.current !== null) {
        clearTimeout(turnTimeoutRef.current as number);
        turnTimeoutRef.current = null;
      }
    };
  }, [turn, preGame]);

  // --- 敵AI: 簡易ターン処理 ---
  useEffect(() => {
    // プリゲーム中は AI を動かさない
    if (preGame) return;
    // 敵ターンになったらAIを走らせる（turn % 2 === 0 なら敵ターン、turn > 1 で初期ターン以外）
    if (turn > 1 && turn % 2 === 0 && !aiRunning) {
      runEnemyTurn(
        enemyHandCards,
        setEnemyHandCards,
        enemyFieldCards,
        setEnemyFieldCards,
        enemyCurrentMana,
        setEnemyCurrentMana,
        enemyHeroHp,
        playerFieldCards,
        playerHeroHp,
        setPlayerHeroHp,
        setPlayerFieldCards,
        setPlayerGraveyard,
        setGameOver,
        setAiRunning,
        setMovingAttack,
        setEnemyAttackAnimation,
        setEnemySpellAnimation,
        attack,
        endTurn,
        turnTimeoutRef,
        setEnemyGraveyard,
        aiCancelRef
      );
    }
  }, [turn, aiRunning, preGame]);

  // keep refs in sync with state so async callers (AI, logs) can read latest
  useEffect(() => {
    playerFieldRef.current = playerFieldCards;
  }, [playerFieldCards]);
  useEffect(() => {
    enemyFieldRef.current = enemyFieldCards;
  }, [enemyFieldCards]);

  // ゲーム終了時の完全停止: タイマーをクリアし、AI を中断・停止する
  useEffect(() => {
    if (!gameOver.over) return;
    // clear timer
    if (turnTimeoutRef.current !== null) {
      clearTimeout(turnTimeoutRef.current as number);
      turnTimeoutRef.current = null;
    }
    // cancel running AI and prevent new AI start
    aiCancelRef.current = true;
    setAiRunning(false);
    console.debug("[Game] gameOver -> cleared timer and cancelled AI");
  }, [gameOver]);

  // --- ドロー ---
  const addCardToHand = (
    card: Card,
    handList: Card[],
    setHandList: React.Dispatch<React.SetStateAction<Card[]>>,
    graveyardList: Card[],
    setGraveyardList: React.Dispatch<React.SetStateAction<Card[]>>
  ) => {
    // use functional updates to avoid stale snapshot issues
    setHandList((prev) => {
      if (prev.length >= MAX_HAND) {
        // push to graveyard instead
        setGraveyardList((gPrev) => [...gPrev, card]);
        console.log(`${card.name} は手札があふれたため破棄されました`);
        return prev;
      }
      return [...prev, card];
    });
  };
  const drawPlayerCard = () => {
    if (deck.length === 0) return;
    const card = { ...deck[0], uniqueId: uuidv4() };
    setDeck((prev) => prev.slice(1));
    addCardToHand(card, playerHandCards, setPlayerHandCards, playerGraveyard, setPlayerGraveyard);
  };

  const drawEnemyCard = () => {
    if (enemyDeck.length === 0) return;
    const card = { ...enemyDeck[0], uniqueId: uuidv4() };
    setEnemyDeck((prev) => prev.slice(1));
    addCardToHand(card, enemyHandCards, setEnemyHandCards, enemyGraveyard, setEnemyGraveyard);
  };

  // --- ターン終了 ---
  const endTurn = () => {
    console.debug(`[Game] endTurn called (current turn=${turn})`);
    setTurn((t) => t + 1);
  };

  // --- ゲームリセット（新しい対戦を開始） ---
  const resetGame = (mode: "cpu" | "pvp" = "cpu") => {
    // 既存のタイマーをクリア
    if (turnTimeoutRef.current !== null) {
      clearTimeout(turnTimeoutRef.current as number);
      turnTimeoutRef.current = null;
    }
    setAiRunning(false);
    setMovingAttack(null);
    // 敵AI 中断フラグを立てる
    aiCancelRef.current = true;

    // 新しいデッキを作成して初期手札を配る
    const newDeck = createDeck();
    const newEnemyDeck = createDeck();
    const initialPlayerHand = drawInitialHand(newDeck, 5).map((c) => ({ ...c, uniqueId: uuidv4() }));
    const initialEnemyHand = drawInitialHand(newEnemyDeck, 5).map((c) => ({ ...c, uniqueId: uuidv4() }));

    setDeck([...newDeck.slice(5)]);
    setEnemyDeck([...newEnemyDeck.slice(5)]);
    setPlayerHandCards(initialPlayerHand);
    setEnemyHandCards(initialEnemyHand);
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
    setTurnSecondsRemaining(60);
    remainingRef.current = 60;
    setGameOver({ over: false, winner: null });
    // プリゲーム（先攻/後攻決めとマリガン）を開始
    setPreGame(true);
    setCoinResult("deciding");
    // 初回ターンは特別扱い（プリゲーム直後の最初のターンはマナ増加を行わない）
    initialTurnRef.current = true;
    lastRoundIncreasedRef.current = null;
  };

  // コイントスの結果確定（'player' が先攻、'enemy' が後攻）
  const finalizeCoin = (winner: "player" | "enemy") => {
    setCoinResult(winner);
    // 先攻が player の場合 turn を 1 にして player が先行、敵が先攻なら turn を 2 にして敵先行
    if (winner === "player") setTurn(1);
    else setTurn(2);
  };

  // マリガン: 指定したユニークIDのカード群をデッキに戻してドローし直す
  const doMulligan = (keepIds: string[]) => {
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
  const playCardToField = (card: Card) => {
    // スペルはフィールドに出せない（ターゲットへドラッグして使用する仕様）
    if (card.type === "spell") {
      console.log("スペルはフィールドに出せません。ターゲットにドロップして使用してください。");
      return;
    }

    // フィールドには最大5体まで
    if (playerFieldCards.length >= 5) {
      console.log("フィールドは最大5体までです。");
      return;
    }

    if (card.cost > currentMana) {
      console.log("マナが足りません！");
      return;
    }
    setCurrentMana((m) => m - card.cost);

    // canAttack: rush または superHaste がある場合は出したターンから攻撃可能
    const canAttack = !!(card.rush || card.superHaste);
    setPlayerFieldCards((f) => [
      ...f,
      {
        ...card,
        maxHp: card.hp ?? 0,
        canAttack,
        rushInitialTurn: card.rush ? true : undefined, // rush の初回ターンかどうかをマーク
      },
    ]);

    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));

    // 召喚時効果の発動（例: 騎士の召喚時全体ダメージなど）
    if (card.summonEffect) {
      const se = card.summonEffect;
      if (se.type === "damage_all" && (se.value ?? 0) > 0) {
        const dmg = se.value ?? 1;
        // 敵フィールドとヒーローにダメージ
        setEnemyFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
        setEnemyHeroHp((h) => {
          const next = Math.max(h - dmg, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "player" });
            if (turnTimeoutRef.current !== null) {
              clearTimeout(turnTimeoutRef.current as number);
              turnTimeoutRef.current = null;
            }
            setAiRunning(false);
          }
          return next;
        });
      }
    }

    // 召喚時トリガーの発動（例: 魔導士の召喚時に火球を手札に加える）
    if (card.summonTrigger) {
      const trigger = card.summonTrigger;
      if (trigger.type === "add_card_hand" && trigger.cardId) {
        const addCard = cards.find((c) => c.id === trigger.cardId);
        if (addCard) {
          const newCard = { ...addCard, uniqueId: crypto.randomUUID() };
          setPlayerHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
        }
      }
    }
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
    const attackerList = isPlayerAttacker ? playerFieldRef.current : enemyFieldRef.current;
    const targetList = isPlayerAttacker ? enemyFieldRef.current : playerFieldRef.current;
    const setAttackerList = isPlayerAttacker ? setPlayerFieldCards : setEnemyFieldCards;
    const setTargetList = isPlayerAttacker ? setEnemyFieldCards : setPlayerFieldCards;
    const setTargetHeroHp = isPlayerAttacker ? setEnemyHeroHp : setPlayerHeroHp;
    const setGraveyard = isPlayerAttacker ? setEnemyGraveyard : setPlayerGraveyard;

    // デバッグ: 呼び出し時点の攻撃者リストと防御者リストを出力
    console.log('[Game] attack() invoked with attackerId:', attackerId, 'targetId:', targetId, 'isPlayerAttacker:', isPlayerAttacker);
    console.log('[Game] attackerList snapshot:', attackerList.map(a => ({ uniqueId: a.uniqueId, name: a.name, hp: a.hp, canAttack: a.canAttack })));
    console.log('[Game] targetList snapshot:', targetList.map(t => ({ uniqueId: t.uniqueId, name: t.name, hp: t.hp, stealth: (t as any).stealth })));

    const attacker = attackerList.find((c) => c.uniqueId === attackerId);
    if (!attacker) {
      console.log('[Game] attack aborted - attacker not found in attackerList', attackerId);
      return;
    }
    if (!attacker.canAttack) {
      console.log('[Game] attack aborted - attacker cannot attack (canAttack=false)', attackerId, attacker.name);
      return;
    }

    console.log('[Game] Attack START -', { attacker: { name: attacker.name, hp: attacker.hp, attack: attacker.attack, canAttack: attacker.canAttack }, targetId, isPlayerAttacker });

    // rush カードの場合、出したターンは相手フォロワーのみ攻撃可能
    if ((attacker as { rushInitialTurn?: boolean }).rushInitialTurn && targetId === "hero") {
      console.log("突撃はこのターン、相手フォロワーのみ攻撃可能です");
      return;
    }

    // wallGuard チェック（敵フィールドに鉄壁持ちがいる場合、相手フォロワー以外は攻撃できない）
    const defendList = isPlayerAttacker ? enemyFieldCards : playerFieldCards;
    const hasWallGuard = defendList.some((c) => (c as { wallGuard?: boolean }).wallGuard);
    if (hasWallGuard && targetId === "hero") {
      console.log("相手は鉄壁を持っているため、ヒーローは攻撃できません");
      return;
    }

    if (targetId === "hero") {
      // ユニット固有の onAttackEffect を考慮（槍兵のヒーロー攻撃ボーナス等）
      const base = attacker.attack ?? 0;
      const extra = attacker.onAttackEffect === "bonus_vs_hero" ? (attacker.attack ?? 0) : 0;
      const total = base + extra;
      // ヒーローにまとめてダメージを与える
      setTargetHeroHp((hp) => {
        const next = Math.max(hp - total, 0);
        console.log('[Game] Hero HP before:', hp, 'after attack by', attacker.name, '->', next);
        if (next <= 0) {
          setGameOver({ over: true, winner: isPlayerAttacker ? "player" : "enemy" });
          if (turnTimeoutRef.current !== null) {
            clearTimeout(turnTimeoutRef.current as number);
            turnTimeoutRef.current = null;
          }
          setAiRunning(false);
        }
        return next;
      });

      // ヒーローを攻撃した場合でも攻撃済みにする & stealth を解除、rush 初回ターン フラグも解除
      setAttackerList((list) => {
        const updated = list.map((c) => (c.uniqueId === attackerId ? { ...c, canAttack: false, stealth: false, rushInitialTurn: undefined } : c));
        console.log('[Game] Attacker list after hero attack (attacker marked used):', updated.map(a => ({ name: a.name, hp: a.hp, canAttack: a.canAttack })));
        return updated;
      });

      // 攻撃時効果: 自分にダメージを受ける等
      if (attacker.onAttackEffect === "self_damage_1") {
        setAttackerList((list) => {
          const updated = list.map((c) => (c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - 1 } : c));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) {
            const setAttackerGrave = isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard;
            setAttackerGrave((g) => [...g, ...dead.filter((d) => !g.some(x => x.uniqueId === d.uniqueId))]);
            return updated.filter((c) => (c.hp ?? 0) > 0);
          }
          return updated;
        });
      }
    } else {
      const target = targetList.find((c) => c.uniqueId === targetId);
      if (!target) {
        console.log('[Game] attack aborted - target not found', targetId);
        return;
      }

      // ターゲットが隠密状態であれば攻撃不能
      if ((target as { stealth?: boolean }).stealth) {
        console.log("そのフォロワーは隠密状態でターゲットにできません");
        return;
      }

      // 双方にダメージ
      const newTargetList = targetList.map((c) =>
        c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - (attacker.attack ?? 0) } : c
      );
      console.log('[Game] Target list before update (target hp):', target.name, target.hp);
      setTargetList((prev) => {
        console.log('[Game] Target list after attack by', attacker.name, '->', newTargetList.map(t => ({ name: t.name, hp: t.hp })));
        return newTargetList;
      });

      const newAttackerList = attackerList.map((c) =>
        c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - (target.attack ?? 0), canAttack: false, rushInitialTurn: undefined } : c
      );
      setAttackerList((prev) => {
        console.log('[Game] Attacker list after reciprocal damage:', newAttackerList.map(a => ({ name: a.name, hp: a.hp, canAttack: a.canAttack })));
        return newAttackerList;
      });

      // HP0以下のカードを墓地へ
  const deadTargets = newTargetList.filter((c) => (c.hp ?? 0) <= 0);
  if (deadTargets.length) {
    const setTargetGrave = isPlayerAttacker ? setEnemyGraveyard : setPlayerGraveyard;
    setTargetGrave((g) => {
      const added = deadTargets.filter(d => !g.some(x => x.uniqueId === d.uniqueId));
      console.log('[Game] Moving to target graveyard:', added.map(a=>a.name));
      return [...g, ...added];
    });
    
    // 倒されたカードの death trigger を発動（例: 斥候が倒されたら兵士を手札に加える）
    deadTargets.forEach((deadCard: any) => {
      if (deadCard.deathTrigger) {
        const trigger = deadCard.deathTrigger;
        if (trigger.type === "add_card_hand" && trigger.cardId) {
          const addCard = cards.find((c) => c.id === trigger.cardId);
          if (addCard) {
            const newCard = { ...addCard, uniqueId: crypto.randomUUID() };
            if (isPlayerAttacker) {
              // 敵カードが倒されたので、敵の手札に加える
              setEnemyHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
            } else {
              // プレイヤーカードが倒されたので、プレイヤーの手札に加える
              setPlayerHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
            }
          }
        }
      }
    });
  }
      setTargetList((list) => list.filter((c) => (c.hp ?? 0) > 0));

      const deadAttackers = newAttackerList.filter((c) => (c.hp ?? 0) <= 0);
      if (deadAttackers.length) {
        const setAttackerGrave = isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard;
        setAttackerGrave((g) => [...g, ...deadAttackers.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
        setAttackerList((list) => list.filter((c) => (c.hp ?? 0) > 0));
      }

      // 攻撃時効果（例: 剣士の自己ダメージ）
      if (attacker.onAttackEffect === "self_damage_1") {
        setAttackerList((list) => {
          const updated = list.map((c) => (c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - 1 } : c));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) {
            const setAttackerGrave = isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard;
            setAttackerGrave((g) => [...g, ...dead.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
            return updated.filter((c) => (c.hp ?? 0) > 0);
          }
          return updated;
        });
      }
    }
  };

  // --- スペルの発動（シンプル実装） ---
  const castSpell = (cardUniqueId: string, targetId: string | "hero", isPlayer: boolean = true) => {
    // プレイヤーか敵かの手札からカードを探す
    const card = playerHandCards.find((c) => c.uniqueId === cardUniqueId) || enemyHandCards.find((c) => c.uniqueId === cardUniqueId);
    if (!card || card.type !== "spell") return;

    // マナチェック（プレイヤーが使う想定）
    if (card.cost > currentMana) {
      console.log("マナが足りません（spell）");
      return;
    }
    setCurrentMana((m) => m - card.cost);

    // effect ベースで判定する（name に依存しない）
    const effect = card.effect || "";

    switch (effect) {
      case "heal_single":
        // 対象を回復（ヒーロー or フィールド）
        if (targetId === "hero") heal("hero", 2, true);
        else heal(targetId, 2, true);
        break;
      case "damage_all":
        // 敵フィールド全体 + 敵ヒーローにダメージ（2固定）
        setEnemyFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - 2 }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
        setEnemyHeroHp((h) => {
          const next = Math.max(h - 2, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "player" });
            if (turnTimeoutRef.current !== null) {
              clearTimeout(turnTimeoutRef.current as number);
              turnTimeoutRef.current = null;
            }
            setAiRunning(false);
          }
          return next;
        });
        break;
      case "damage_single":
        // 単体ダメージ。カードごとに量を微調整（例：雷撃は4、それ以外は3）
        const isLightning = (card.name || "").toLowerCase().includes("雷") || (card.name || "").toLowerCase().includes("lightning") || (card.name || "").toLowerCase().includes("雷撃");
        const dmg = isLightning ? 4 : 3;
        if (targetId === "hero") {
          setEnemyHeroHp((h) => {
            const next = Math.max(h - dmg, 0);
            if (next <= 0) {
              setGameOver({ over: true, winner: "player" });
              if (turnTimeoutRef.current !== null) {
                clearTimeout(turnTimeoutRef.current as number);
                turnTimeoutRef.current = null;
              }
              setAiRunning(false);
            }
            return next;
          });
        } else {
          setEnemyFieldCards((list) => {
            const updated = list.map((c) => (c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - dmg } : c));
            const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
            if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
            return updated.filter((c) => (c.hp ?? 0) > 0);
          });
        }
        break;
      case "poison":
        // 毒：対象フォロワーに毎ターンダメージを与える状態を付与
        if (targetId === "hero") {
          // ヒーローに対しては即時ダメージ（簡易扱い）
          const pdmg = card.effectValue ?? 1;
          setEnemyHeroHp((h) => Math.max(h - pdmg, 0));
        } else {
          setEnemyFieldCards((list) =>
            list.map((c) => (c.uniqueId === targetId ? { ...c, poison: card.statusDuration ?? 3, poisonDamage: card.effectValue ?? 1 } : c))
          );
        }
        break;
      case "freeze_single":
        // 凍結：対象フォロワーを指定ターン凍結（行動不可）にする
        if (targetId === "hero") {
          // ヒーロー凍結は無視（UI的には未対応）
        } else {
          setEnemyFieldCards((list) =>
            list.map((c) => (c.uniqueId === targetId ? { ...c, frozen: card.statusDuration ?? 1, canAttack: false } : c))
          );
        }
        break;
      case "haste":
        // 加速：自分のフォロワーに突進を付与して即時攻撃可にする
        // 条件：自分のフォロワーのみ、かつ攻撃可能（攻撃済みでない）なもののみ
        if (targetId !== "hero") {
          const target = playerFieldCards.find((c) => c.uniqueId === targetId);
          // 攻撃可能（攻撃済みでない）かつ、まだ rush がない場合のみ付与
          if (target && target.canAttack && !target.rush) {
            setPlayerFieldCards((list) =>
              list.map((c) =>
                c.uniqueId === targetId
                  ? { ...c, canAttack: true, rush: true, haste: true }
                  : c
              )
            );
          } else {
            console.log("加速呪文：攻撃済みまたは既に突進を持っているため付与できません");
          }
        }
        break;
      default:
        // 未定義の effect は何もしない（安全）
        console.debug("未対応の spell effect:", effect, " (card)");
        break;
    }

    // 手札から除去して墓地へ（呼び出し側がプレイヤーか敵かで振り分け）
    if (isPlayer) {
      setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
      setPlayerGraveyard((g) => [...g, { ...card, uniqueId: uuidv4() }]);
    } else {
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
      setEnemyGraveyard((g) => [...g, { ...card, uniqueId: uuidv4() }]);
      // 敵がスペルを使ったら視覚的に見えるようにアニメーションをトリガー
      setEnemySpellAnimation({ targetId, effect: effect });
      // アニメーションを少し表示してから解除（非同期）
      setTimeout(() => setEnemySpellAnimation(null), 600);
    }
  };

  return {
    deck,
    playerHandCards,
    playerFieldCards,
    playerGraveyard,
    playerHeroHp,
    enemyDeck,
    enemyHandCards,
    enemyFieldCards,
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
  };
}

export default useGame;