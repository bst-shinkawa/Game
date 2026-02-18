// ゲームロジック統合フック
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../data/cards";
import type { RuntimeCard, CoinResult, GameOverState } from "../types/gameTypes";
import { deck as initialDeck, drawInitialHand } from "../data/game";
import { createDeck } from "../data/deck";
import { startEnemyTurn, runEnemyTurn } from "../data/enemyAI";
import { MAX_HERO_HP, TURN_DURATION_SECONDS } from "../constants/gameConstants";
import { processStatusEffects } from "../services/statusEffectService";
import { executeAttack } from "../services/attackService";
import { useTurnManagement } from "./useTurnManagement";
import { useCardOperations } from "./useCardOperations";
import { useAnimationManager } from "./useAnimationManager";

export function useGameLogic() {
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

  // --- マナ・ターン ---
  const [turn, setTurn] = useState(1);
  const [maxMana, setMaxMana] = useState(1);
  const [currentMana, setCurrentMana] = useState(1);
  const [enemyMaxMana, setEnemyMaxMana] = useState(1);
  const [enemyCurrentMana, setEnemyCurrentMana] = useState(1);

  // --- DnD ---
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerBattleRef = useRef<HTMLDivElement>(null);
  const playerFieldRef = useRef<RuntimeCard[]>([]);
  const enemyFieldRef = useRef<RuntimeCard[]>([]);

  // --- ゲーム状態 ---
  const [gameOver, setGameOver] = useState<GameOverState>({ over: false, winner: null });
  const [preGame, setPreGame] = useState<boolean>(false);
  const [coinResult, setCoinResult] = useState<CoinResult>("deciding");
  const [pauseTimer, setPauseTimer] = useState<boolean>(false);
  const [aiRunning, setAiRunning] = useState<boolean>(false);
  const aiCancelRef = useRef<boolean>(false);

  // アニメーション管理
  const animationManager = useAnimationManager();

  // カード操作
  const cardOperations = useCardOperations({
    deck,
    setDeck,
    playerHandCards,
    setPlayerHandCards,
    playerFieldCards,
    setPlayerFieldCards,
    playerGraveyard,
    setPlayerGraveyard,
    enemyHandCards,
    setEnemyHandCards,
    enemyFieldCards,
    setEnemyFieldCards,
    enemyGraveyard,
    setEnemyGraveyard,
    currentMana,
    setCurrentMana,
    enemyCurrentMana,
    setEnemyCurrentMana,
    playerHeroHp,
    setPlayerHeroHp,
    enemyHeroHp,
    setEnemyHeroHp,
    setGameOver,
    stopTimer: () => {
      // タイマー停止処理は useTurnManagement で管理
    },
    setAiRunning,
    addCardToDestroying: animationManager.addCardToDestroying,
  });

  // ターン管理
  const turnManagement = useTurnManagement({
    turn,
    setTurn,
    maxMana,
    setMaxMana,
    setCurrentMana,
    enemyMaxMana,
    setEnemyMaxMana,
    setEnemyCurrentMana,
    coinResult,
    preGame,
    pauseTimer,
    drawPlayerCard: cardOperations.drawPlayerCard,
    drawEnemyCard: () => {
      if (enemyDeck.length === 0) return;
      const card = { ...enemyDeck[0], uniqueId: uuidv4() };
      setEnemyDeck((prev) => prev.slice(1));
      // addCardToHand を使用
    },
    setPlayerFieldCards,
    setEnemyFieldCards,
    endTurn: () => {
      setTurn((t) => t + 1);
    },
  });

  // 状態効果の処理
  useEffect(() => {
    if (preGame) return;
    if (pauseTimer) return;

    const playerResult = processStatusEffects(playerFieldCards);
    if (playerResult.dead.length > 0) {
      animationManager.addCardToDestroying(playerResult.dead.map(d => d.uniqueId));
      setPlayerGraveyard((g) => [...g, ...playerResult.dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
    }
    setPlayerFieldCards(playerResult.updated);

    const enemyResult = processStatusEffects(enemyFieldCards);
    if (enemyResult.dead.length > 0) {
      animationManager.addCardToDestroying(enemyResult.dead.map(d => d.uniqueId));
      setEnemyGraveyard((g) => [...g, ...enemyResult.dead.filter((d) => !g.some((x) => x.uniqueId === d.uniqueId))]);
    }
    setEnemyFieldCards(enemyResult.updated);
  }, [turn, preGame, pauseTimer, playerFieldCards, enemyFieldCards, animationManager, setPlayerFieldCards, setEnemyFieldCards, setPlayerGraveyard, setEnemyGraveyard]);

  // refs を同期
  useEffect(() => {
    playerFieldRef.current = playerFieldCards;
  }, [playerFieldCards]);
  useEffect(() => {
    enemyFieldRef.current = enemyFieldCards;
  }, [enemyFieldCards]);

  // ゲーム終了時の処理
  useEffect(() => {
    if (!gameOver.over) return;
    try {
      turnManagement.playerTurnTimer?.stop();
      turnManagement.enemyTurnTimer?.stop();
    } catch (e) { /* ignore */ }
    aiCancelRef.current = true;
    setAiRunning(false);
  }, [gameOver, turnManagement]);

  // 敵AI処理
  useEffect(() => {
    if (preGame) return;
    let enemyAiTimer: ReturnType<typeof setTimeout> | null = null;
    if (turn > 1 && turn % 2 === 0 && !aiRunning && !pauseTimer) {
      const scheduledTurn = turn;
      enemyAiTimer = setTimeout(() => {
        if (preGame || pauseTimer || aiCancelRef.current || turn !== scheduledTurn || aiRunning) return;
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
          animationManager.setMovingAttack,
          animationManager.setEnemyAttackAnimation,
          animationManager.setEnemySpellAnimation,
          (attackerId, targetId, isPlayerAttacker) => {
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
                turnManagement.playerTurnTimer?.stop();
                turnManagement.enemyTurnTimer?.stop();
              },
              setAiRunning,
              isPlayerAttacker,
            }, animationManager.addCardToDestroying);
          },
          () => {
            setTurn((t) => t + 1);
          },
          () => {
            turnManagement.enemyTurnTimer?.stop();
          },
          setEnemyGraveyard,
          aiCancelRef
        );
      }, 1000);
    }
    return () => {
      if (enemyAiTimer) clearTimeout(enemyAiTimer);
    };
  }, [turn, aiRunning, preGame, pauseTimer, enemyHandCards, enemyFieldCards, enemyCurrentMana, enemyHeroHp, playerFieldCards, playerHeroHp, setEnemyHandCards, setEnemyFieldCards, setEnemyCurrentMana, setPlayerHeroHp, setPlayerFieldCards, setPlayerGraveyard, setGameOver, setAiRunning, animationManager, turnManagement]);

  // 初期手札
  useEffect(() => {
    const initialPlayerHand = drawInitialHand(deck, 5).map((c) => ({ ...c, uniqueId: uuidv4() }));
    const initialEnemyHand = drawInitialHand(enemyDeck, 5).map((c) => ({ ...c, uniqueId: uuidv4() }));
    setPlayerHandCards(initialPlayerHand);
    setEnemyHandCards(initialEnemyHand);
    setDeck((prev) => prev.slice(5));
    setEnemyDeck((prev) => prev.slice(5));
  }, []);

  // 攻撃処理
  const attack = (attackerId: string, targetId: string | "hero", isPlayerAttacker: boolean = true) => {
    if (isPlayerAttacker) {
      animationManager.setEnemyAttackAnimation({ sourceCardId: attackerId, targetId });
    } else {
      animationManager.setEnemyAttackAnimation({ sourceCardId: attackerId, targetId });
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
        turnManagement.playerTurnTimer?.stop();
        turnManagement.enemyTurnTimer?.stop();
      },
      setAiRunning,
      isPlayerAttacker,
    }, animationManager.addCardToDestroying);

    setTimeout(() => {
      animationManager.setEnemyAttackAnimation(null);
    }, 1000);
  };

  // HP回復
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

  // ゲームリセット
  const resetGame = (mode: "cpu" | "pvp" = "cpu") => {
    try {
      turnManagement.playerTurnTimer?.stop();
      turnManagement.enemyTurnTimer?.stop();
    } catch (e) { /* ignore */ }
    setAiRunning(false);
    animationManager.setMovingAttack(null);
    aiCancelRef.current = true;

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
    turnManagement.playerTurnTimer?.setDuration(TURN_DURATION_SECONDS);
    turnManagement.playerTurnTimer?.reset();
    turnManagement.enemyTurnTimer?.setDuration(TURN_DURATION_SECONDS);
    turnManagement.enemyTurnTimer?.reset();
    setGameOver({ over: false, winner: null });
    setPreGame(true);
    setCoinResult("deciding");
    aiCancelRef.current = false;
  };

  const finalizeCoin = (winner: "player" | "enemy") => {
    setCoinResult(winner);
    if (winner === "player") setTurn(1);
    else setTurn(2);
  };

  const doMulligan = (keepIds: string[]) => {
    const kept = playerHandCards.filter(c => keepIds.includes(c.uniqueId));
    const toReturn = playerHandCards.filter(c => !keepIds.includes(c.uniqueId));
    let newDeck = [...deck, ...toReturn.map(c => ({ ...c, uniqueId: uuidv4() }))];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
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

  const startMatch = () => {
    setPreGame(false);
    aiCancelRef.current = false;
  };

  // フィールドカードのフィルタリング（破壊アニメーション中のカードは残す）
  const getPlayerFieldCards = () => {
    return playerFieldCards.filter((c) => {
      if (animationManager.destroyingCards.has(c.uniqueId)) return true;
      return (c.hp ?? 0) > 0;
    });
  };

  const getEnemyFieldCards = () => {
    return enemyFieldCards.filter((c) => {
      if (animationManager.destroyingCards.has(c.uniqueId)) return true;
      return (c.hp ?? 0) > 0;
    });
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
    playCardToField: cardOperations.playCardToField,
    endTurn: () => setTurn((t) => t + 1),
    attack,
    heal,
    castSpell: cardOperations.castSpell,
    turnSecondsRemaining: turnManagement.turnSecondsRemaining,
    aiRunning,
    movingAttack: animationManager.movingAttack,
    enemyAttackAnimation: animationManager.enemyAttackAnimation,
    enemySpellAnimation: animationManager.enemySpellAnimation,
    gameOver,
    resetGame,
    preGame,
    coinResult,
    finalizeCoin,
    doMulligan,
    startMatch,
    playerTurnTimer: turnManagement.playerTurnTimer,
    enemyTurnTimer: turnManagement.enemyTurnTimer,
    setPauseTimer,
    destroyingCards: animationManager.destroyingCards,
  };
}
