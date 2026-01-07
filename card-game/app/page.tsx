"use client";
import React, { useState } from "react";
import dynamic from 'next/dynamic';
import { useGameContext } from "./context/GameContext";
import { useGameUI } from "./hooks/useGameUI";
const GameField = dynamic(() => import('./components/GameField').then(mod => mod.GameField), { ssr: false, loading: () => <div>Loading...</div> });
import StartMenu from "./components/StartMenu";
import ErrorBoundary from "./components/ErrorBoundary";

const GamePage: React.FC = () => {
  const [mode, setMode] = useState<"menu" | "game" | "deck">("menu");
  const gameState = useGameContext();
  const uiState = useGameUI();

  if (mode === "menu") {
    const tryLockLandscape = async () => {
      if (typeof window === "undefined") return;
      try {
        // iOS Safari doesn't support orientation.lock; catch failures
        if (document.fullscreenEnabled) {
          await document.documentElement.requestFullscreen();
        }
        // @ts-ignore
        if (screen?.orientation && (screen.orientation as any).lock) {
          // try locking to landscape-primary first
          // @ts-ignore
          await (screen.orientation as any).lock("landscape");
        }
      } catch (e) {
        // ignore; we'll show rotate overlay via AppViewport
        console.info("orientation lock failed or not supported", e);
      }
    };

    return (
      <StartMenu
        onSelectMode={async (m) => {
          if (m === "cpu") {
            gameState.resetGame("cpu");
            uiState.setDescCardId(null);
            // UI状態をリセット
            uiState.setRouletteRunning(false);
            uiState.setRouletteLabel("...");
            uiState.setShowCoinPopup(false);
            uiState.setSwapIds([]);
            uiState.setMulliganTimer(15);
          }
          // ユーザーのクリック操作に紐づけてフルスクリーン + 横向きロックを試みる
          await tryLockLandscape();
          setMode("game");
        }}
        onDeck={() => setMode("deck")}
      />
    );
  }

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
    <GameField
      {...gameState}
      {...uiState}
      resetGame={(mode) => {
        gameState.resetGame(mode);
        uiState.setDescCardId(null);
        uiState.setRouletteRunning(false);
        uiState.setRouletteLabel("...");
        uiState.setShowCoinPopup(false);
        uiState.setSwapIds([]);
        uiState.setMulliganTimer(15);
        setMode("game");
      }}
      handAreaRef={uiState.handAreaRef}
      collapseHand={uiState.collapseHand}
    />
  );
};

export default GamePage;
