// ターン管理に関するフック
import { useEffect, useRef, useState } from "react";
import { TurnTimer } from "../data/turnTimer";
import { TURN_DURATION_SECONDS, MAX_MANA } from "../constants/gameConstants";
import type { CoinResult } from "../types/gameTypes";

interface UseTurnManagementProps {
  turn: number;
  setTurn: React.Dispatch<React.SetStateAction<number>>;
  maxMana: number;
  setMaxMana: React.Dispatch<React.SetStateAction<number>>;
  setCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  enemyMaxMana: number;
  setEnemyMaxMana: React.Dispatch<React.SetStateAction<number>>;
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>;
  coinResult: CoinResult;
  preGame: boolean;
  pauseTimer: boolean;
  drawPlayerCard: (deck: Card[], setDeck: React.Dispatch<React.SetStateAction<Card[]>>, playerHandCards: Card[], setPlayerHandCards: React.Dispatch<React.SetStateAction<Card[]>>, playerGraveyard: Card[], setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>) => void;
  drawEnemyCard: (enemyDeck: Card[], setEnemyDeck: React.Dispatch<React.SetStateAction<Card[]>>, enemyHandCards: Card[], setEnemyHandCards: React.Dispatch<React.SetStateAction<Card[]>>, enemyGraveyard: Card[], setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>) => void;
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<any[]>>;
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<any[]>>;
  endTurn: () => void;
}

export function useTurnManagement({
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
  drawPlayerCard,
  drawEnemyCard,
  setPlayerFieldCards,
  setEnemyFieldCards,
  endTurn,
}: UseTurnManagementProps) {
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<number>(TURN_DURATION_SECONDS);
  const playerTurnTimerRef = useRef<TurnTimer | null>(new TurnTimer(TURN_DURATION_SECONDS));
  const enemyTurnTimerRef = useRef<TurnTimer | null>(new TurnTimer(TURN_DURATION_SECONDS));
  const modalPauseRef = useRef<boolean>(false);

  // ターン開始時の処理
  useEffect(() => {
    if (preGame) return;
    if (pauseTimer) return;

    // ターン開始ごとの共通処理：canAttack をリセット
    setPlayerFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: false, rushInitialTurn: undefined })));
    setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: false, rushInitialTurn: undefined })));

    // ターン開始時のマナ増加処理
    const isPlayerTurn = turn % 2 === 1;
    const isPlayerFirst = coinResult === 'player';

    if (isPlayerFirst && isPlayerTurn) {
      setMaxMana((prevMax) => Math.min(prevMax + 1, MAX_MANA));
    } else if (!isPlayerFirst && !isPlayerTurn) {
      setEnemyMaxMana((prevMax) => Math.min(prevMax + 1, MAX_MANA));
    }

    if (turn % 2 === 1) {
      // プレイヤーターン開始
      drawPlayerCard();
      setPlayerFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
      setCurrentMana((_) => Math.min(maxMana, MAX_MANA));
    } else {
      // 敵ターン開始
      drawEnemyCard();
      setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true })));
      setEnemyCurrentMana((_) => Math.min(enemyMaxMana, MAX_MANA));
    }
  }, [turn, preGame, pauseTimer, coinResult, maxMana, enemyMaxMana, drawPlayerCard, drawEnemyCard, setPlayerFieldCards, setEnemyFieldCards, setMaxMana, setEnemyMaxMana, setCurrentMana, setEnemyCurrentMana]);

  // ターンタイマーの管理
  useEffect(() => {
    if (preGame) return;

    modalPauseRef.current = true;
    setPauseTimer(true);
    const modalDuration = (turn % 2 === 1) ? 2000 : 1200;
    const modalTimer = setTimeout(() => {
      if (modalPauseRef.current) {
        modalPauseRef.current = false;
        setPauseTimer(false);
      }
    }, modalDuration);

    playerTurnTimerRef.current?.setDuration(TURN_DURATION_SECONDS);
    playerTurnTimerRef.current?.reset();
    enemyTurnTimerRef.current?.setDuration(TURN_DURATION_SECONDS);
    enemyTurnTimerRef.current?.reset();

    const activeRemaining = (turn % 2 === 1 ? playerTurnTimerRef.current?.getRemaining() : enemyTurnTimerRef.current?.getRemaining()) ?? TURN_DURATION_SECONDS;
    setTurnSecondsRemaining(activeRemaining);

    const playerTick = (remaining: number) => {
      if (turn % 2 === 1) {
        setTurnSecondsRemaining(remaining);
      }
    };
    const enemyTick = (remaining: number) => {
      if (turn % 2 === 0) {
        setTurnSecondsRemaining(remaining);
      }
    };

    const playerEnd = () => {
      endTurn();
    };
    const enemyEnd = () => {
      endTurn();
    };

    const offPlayerTick = playerTurnTimerRef.current?.onTick(playerTick);
    const offPlayerEnd = playerTurnTimerRef.current?.onEnd(playerEnd);
    const offEnemyTick = enemyTurnTimerRef.current?.onTick(enemyTick);
    const offEnemyEnd = enemyTurnTimerRef.current?.onEnd(enemyEnd);

    if (!pauseTimer) {
      if (turn % 2 === 1) playerTurnTimerRef.current?.start();
      else enemyTurnTimerRef.current?.start();
    }

    return () => {
      clearTimeout(modalTimer);
      modalPauseRef.current = false;
      if (offPlayerTick) offPlayerTick();
      if (offPlayerEnd) offPlayerEnd();
      if (offEnemyTick) offEnemyTick();
      if (offEnemyEnd) offEnemyEnd();
      playerTurnTimerRef.current?.pause();
      enemyTurnTimerRef.current?.pause();
    };
  }, [turn, preGame, pauseTimer, endTurn]);

  // UI の一時停止要求に応じて pause/resume を行う
  useEffect(() => {
    if (pauseTimer) {
      playerTurnTimerRef.current?.pause();
      enemyTurnTimerRef.current?.pause();
    } else {
      const p = playerTurnTimerRef.current;
      const e = enemyTurnTimerRef.current;
      if (turn % 2 === 1) {
        if (p && !p.isRunning() && p.getRemaining() > 0) p.start();
      } else {
        if (e && !e.isRunning() && e.getRemaining() > 0) e.start();
      }
    }
  }, [pauseTimer, turn]);

  return {
    turnSecondsRemaining,
    playerTurnTimer: playerTurnTimerRef.current,
    enemyTurnTimer: enemyTurnTimerRef.current,
  };
}
