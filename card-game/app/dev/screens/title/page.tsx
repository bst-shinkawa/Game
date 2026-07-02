"use client";

import { useSearchParams } from "next/navigation";
import StartMenu from "@/app/components/StartMenu";

export default function DevTitleScreenPage() {
  const params = useSearchParams();
  const variant = params.get("variant") ?? "main";

  const showEntryChoice = variant === "entry";
  const isLoggedIn = variant === "logged-in";

  return (
    <StartMenu
      authChecked
      showEntryChoice={showEntryChoice}
      isLoggedIn={isLoggedIn}
      playerName={isLoggedIn ? "テストプレイヤー" : null}
      onSelectGuest={() => {}}
      onGoogleLogin={() => {}}
      onLogout={() => {}}
      onOpenProfile={() => {}}
      onSelectMode={() => {}}
      onDeck={() => {}}
    />
  );
}
