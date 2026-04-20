"use client";
import React, { useEffect, useState } from "react";
import dynamic from 'next/dynamic';
import { useGameContext } from "./context/GameContext";
import { useGameUI } from "./hooks/useGameUI";
const GameField = dynamic(() => import('./components/GameField').then(mod => mod.GameField), { ssr: false, loading: () => <div>Loading...</div> });
import StartMenu from "./components/StartMenu";
import DeckBuilder from "./components/DeckBuilder";
import styles from "./assets/css/Game.Master.module.css";

const GamePage: React.FC = () => {
  const [mode, setMode] = useState<"menu" | "game" | "deck">("menu");
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestSelected, setGuestSelected] = useState(false);
  const gameState = useGameContext();
  const uiState = useGameUI({ lockHandCollapse: gameState.selectionMode !== "none" });

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = (await res.json()) as { user?: { id?: string } };
        if (!mounted) return;
        const loggedIn = !!data?.user?.id;
        setIsLoggedIn(loggedIn);
        if (loggedIn) setGuestSelected(true);
      } catch {
        if (!mounted) return;
        setIsLoggedIn(false);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    };
    checkSession();
    return () => {
      mounted = false;
    };
  }, []);

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
        authChecked={authChecked}
        showEntryChoice={!isLoggedIn && !guestSelected}
        onSelectGuest={() => setGuestSelected(true)}
        onGoogleLogin={() => {
          window.location.href = "/api/auth/signin/google";
        }}
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
      <div className={styles.pregame__wrap}>
        <DeckBuilder onBack={() => setMode("menu")} />
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
      goToMenu={() => setMode("menu")}
      handAreaRef={uiState.handAreaRef}
      collapseHand={uiState.collapseHand}
    />
  );
};

export default GamePage;
