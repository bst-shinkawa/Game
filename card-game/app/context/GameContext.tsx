"use client";
import React, { createContext, useContext } from "react";
import useGame from "../Game";

type GameContextType = ReturnType<typeof useGame> | null;

export const GameContext = createContext<GameContextType>(null);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const game = useGame();
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within GameProvider");
  }
  return context;
};
