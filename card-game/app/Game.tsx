// Game.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "./data/cards";
import { deck as initialDeck, drawInitialHand } from "./data/game";
import { createDeck } from "./data/deck";

const MAX_HAND = 10;
const MAX_MANA = 10;
const MAX_HERO_HP = 20;

export function useGame() {
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

  // --- マナ・ターン ---
  const [turn, setTurn] = useState(1);
  const [maxMana, setMaxMana] = useState(1);
  const [currentMana, setCurrentMana] = useState(1);
  const [enemyMaxMana, setEnemyMaxMana] = useState(1);
  const [enemyCurrentMana, setEnemyCurrentMana] = useState(1);
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<number>(60);
  const turnTimeoutRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(60);
  // プレゲーム（先攻決め＋マリガン）フラグとコイン結果
  const [preGame, setPreGame] = useState<boolean>(false);
  const [coinResult, setCoinResult] = useState<"deciding" | "player" | "enemy">("deciding");
  // ゲーム終了フラグと勝者
  const [gameOver, setGameOver] = useState<{ over: boolean; winner: null | "player" | "enemy" }>({ over: false, winner: null });
  // 敵AI実行中フラグ（再入防止）
  const [aiRunning, setAiRunning] = useState<boolean>(false);
  // 視覚用：AIが攻撃を行うときの移動表示を通知する
  const [movingAttack, setMovingAttack] = useState<{ attackerId: string; targetId: string | "hero" } | null>(null);

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
    if (turn > 1) {
      // ターン番号の奇遇でプレイヤー／敵のターンを判定（1: player, 2: enemy, 3: player ...）
      if (turn % 2 === 1) {
        // プレイヤーのターン開始
        drawPlayerCard();
        setPlayerFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
        // プレイヤーのターン開始時にマナを1増やす（上限あり）
        setMaxMana((prev) => {
          const newMax = Math.min(prev + 1, MAX_MANA);
          setCurrentMana(newMax);
          return newMax;
        });
      } else {
        // 敵のターン開始
        drawEnemyCard();
        setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
        // 敵のターン開始時に敵のマナを1増やす（上限あり）
        setEnemyMaxMana((prev) => {
          const newMax = Math.min(prev + 1, MAX_MANA);
          setEnemyCurrentMana(newMax);
          return newMax;
        });
      }
    }
  }, [turn]);

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
    if (turn > 1 && turn % 2 === 0 && !aiRunning) {
      // 敵ターンになったらAIを走らせる（再入防止）
      const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

      const runEnemyTurn = async () => {
        try {
          setAiRunning(true);
          // 少し待ってから行動開始（見た目の余裕）
          await sleep(800);

          // 1) プレイフェイズ: フォロワーを出せるだけ出す（簡易）
          for (const card of [...enemyHandCards]) {
            if (card.type === "follower" && card.cost <= enemyCurrentMana) {
                // 敵フィールドが満杯なら出せない
                if (enemyFieldCards.length >= 5) continue;
                // 消費マナを即座に反映
                setEnemyCurrentMana((m) => m - card.cost);
                // 一旦アニメ用フラグ付きで追加し、sleep 後にフラグを外す
                const animId = uuidv4();
                setEnemyFieldCards((f) => [
                  ...f,
                  { ...card, maxHp: card.hp ?? 0, canAttack: !!card.rush, uniqueId: animId, isAnimating: true },
                ]);
                // 手札から削除
                setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));
                // アニメを見せるため少し待ってからフラグを切る
                (async () => {
                  await sleep(600);
                  setEnemyFieldCards((list) => list.map((c) => (c.uniqueId === animId ? { ...c, isAnimating: false } : c)));
                })();
              // 手札から削除
              await sleep(800);
            }
          }

          // 2) 攻撃フェイズ: 出せるフォロワーは攻撃（単純に順番に攻撃）
          for (const enemyCard of [...enemyFieldCards]) {
            // 再取得してcanAttackが有効なものを処理
            const fresh = enemyFieldCards.find((c) => c.uniqueId === enemyCard.uniqueId);
            if (!fresh || !fresh.canAttack) continue;

            // 攻撃対象: プレイヤーフィールドがあれば先頭、無ければヒーロー
            const target = playerFieldCards.length > 0 ? playerFieldCards[0].uniqueId : "hero";
            // 視覚アニメ用に通知してから攻撃を実行
            setMovingAttack({ attackerId: enemyCard.uniqueId, targetId: target });
            // アニメ表示時間分待つ
            await sleep(900);
            attack(enemyCard.uniqueId, target, false);
            // 少し待ってから表示フラグを消す
            await sleep(200);
            setMovingAttack(null);
          }

          // 3) ターン終了（行動完了後、少し待つことで演出を見せる）
          await sleep(2000);
          endTurn();
        } finally {
          setAiRunning(false);
        }
      };

      runEnemyTurn();
    }
  }, [turn, enemyHandCards, enemyFieldCards, enemyCurrentMana, playerFieldCards, aiRunning, preGame]);

  // --- ドロー ---
  const addCardToHand = (
    card: Card,
    handList: Card[],
    setHandList: React.Dispatch<React.SetStateAction<Card[]>>,
    graveyardList: Card[],
    setGraveyardList: React.Dispatch<React.SetStateAction<Card[]>>
  ) => {
    if (handList.length >= MAX_HAND) {
      setGraveyardList([...graveyardList, card]);
      console.log(`${card.name} は手札があふれたため破棄されました`);
    } else {
      setHandList([...handList, card]);
    }
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
    setPreGame(false);
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

    const canAttack = !!card.rush;
    setPlayerFieldCards((f) => [
      ...f,
      {
        ...card,
        maxHp: card.hp ?? 0,
        canAttack,
      },
    ]);

    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));
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
    const attackerList = isPlayerAttacker ? playerFieldCards : enemyFieldCards;
    const targetList = isPlayerAttacker ? enemyFieldCards : playerFieldCards;
    const setAttackerList = isPlayerAttacker ? setPlayerFieldCards : setEnemyFieldCards;
    const setTargetList = isPlayerAttacker ? setEnemyFieldCards : setPlayerFieldCards;
    const setTargetHeroHp = isPlayerAttacker ? setEnemyHeroHp : setPlayerHeroHp;
    const setGraveyard = isPlayerAttacker ? setEnemyGraveyard : setPlayerGraveyard;

    const attacker = attackerList.find((c) => c.uniqueId === attackerId);
    if (!attacker || !attacker.canAttack) return;

    if (targetId === "hero") {
      setTargetHeroHp((hp) => {
        const next = Math.max(hp - (attacker.attack ?? 0), 0);
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
    } else {
      const target = targetList.find((c) => c.uniqueId === targetId);
      if (!target) return;

      // 双方にダメージ
      const newTargetList = targetList.map((c) =>
        c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - (attacker.attack ?? 0) } : c
      );
      setTargetList(newTargetList);

      const newAttackerList = attackerList.map((c) =>
        c.uniqueId === attackerId ? { ...c, hp: (c.hp ?? 0) - (target.attack ?? 0), canAttack: false } : c
      );
      setAttackerList(newAttackerList);

      // HP0以下のカードを墓地へ
  const deadTargets = newTargetList.filter((c) => (c.hp ?? 0) <= 0);
  if (deadTargets.length) setGraveyard((g) => [...g, ...deadTargets.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
      setTargetList((list) => list.filter((c) => (c.hp ?? 0) > 0));

      const deadAttackers = newAttackerList.filter((c) => (c.hp ?? 0) <= 0);
      if (deadAttackers.length) {
        const setAttackerGrave = isPlayerAttacker ? setPlayerGraveyard : setEnemyGraveyard;
        setAttackerGrave((g) => [...g, ...deadAttackers.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
        setAttackerList((list) => list.filter((c) => (c.hp ?? 0) > 0));
      }
    }

    // 攻撃済みにする
    setAttackerList((list) =>
      list.map((c) => (c.uniqueId === attackerId ? { ...c, canAttack: false } : c))
    );
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

    const name = card.name || "";
    const isHeal = name.includes("回復") || name.toLowerCase().includes("heal");

    if (isHeal) {
      // 回復：味方（プレイヤー側）対象に適用
      if (targetId === "hero") heal("hero", 2, true);
      else heal(targetId, 2, true);
    } else if (name.includes("全体") || name.includes("火球") || name.includes("fireball")) {
      // 敵全体と敵ヒーローにダメージ
      setEnemyFieldCards((list) => {
        const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - 2 }));
  const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
  if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
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
    } else {
      // 単体ダメージは敵側対象へ
      if (targetId === "hero") {
        setEnemyHeroHp((h) => {
          const next = Math.max(h - 3, 0);
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
          const updated = list.map((c) => (c.uniqueId === targetId ? { ...c, hp: (c.hp ?? 0) - 3 } : c));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) setEnemyGraveyard((g) => [...g, ...dead.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
      }
    }

    // 手札から除去して墓地へ（カードがプレイヤー手札にあればそちらを変更）
    setPlayerHandCards((h) => h.filter((c) => c.uniqueId !== cardUniqueId));
    setPlayerGraveyard((g) => [...g, { ...card, uniqueId: uuidv4() }]);
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