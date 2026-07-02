"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PreGame } from "@/app/components/PreGame";
import { createDeck } from "@/app/data/deck";
import styles from "@/app/assets/css/Game.Master.module.css";

const noop = () => {};

export default function DevPreGameScreenPage() {
  const params = useSearchParams();
  const phase = params.get("phase") ?? "mulligan";

  const playerHandCards = useMemo(() => createDeck("king").slice(0, 5), []);

  const coinResult =
    phase === "coin" ? "deciding" as const :
    phase === "result" ? "player" as const :
    "player" as const;

  const showCoinPopup = phase === "result";
  const rouletteRunning = phase === "coin";
  const rouletteLabel = phase === "coin" ? "..." : "player";

  return (
    <div className={`${styles.field} ${styles.field_local}`}>
      <div className={styles.field_bg}>
        <video src="/img/field/bg.mp4" autoPlay muted loop playsInline />
      </div>
      <PreGame
        coinResult={coinResult}
        showCoinPopup={showCoinPopup}
        rouletteRunning={rouletteRunning}
        rouletteLabel={rouletteLabel}
        playerHandCards={playerHandCards}
        currentMana={1}
        mulliganTimer={15}
        swapIds={[]}
        descCardId={null}
        onRouletteAnimEnd={noop}
        onSwapToggle={noop}
        onMulliganSubmit={noop}
        onMulliganSkip={noop}
        onPreGameCardHover={noop}
        setRouletteRunning={noop}
        setSwapIds={noop}
      />
    </div>
  );
}
