"use client";
import React, { useState } from "react";
import { useGameContext } from "./context/GameContext";
import { useGameUI } from "./hooks/useGameUI";
import { GameField } from "./components/GameField";
import StartMenu from "./components/StartMenu";

const GamePage: React.FC = () => {
  const [mode, setMode] = useState<"menu" | "game" | "deck">("menu");
  const gameState = useGameContext();
  const uiState = useGameUI();

  if (mode === "menu") {
    return (
      <StartMenu
        onSelectMode={(m) => {
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
