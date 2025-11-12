import { v4 as uuidv4 } from "uuid";
import type { Card } from "./cards";
import { cards } from "./cards";
import type { MutableRefObject } from "react";

const MAX_MANA = 10;
const MAX_HAND = 10;

export function startEnemyTurn(
  enemyDeck: Card[],
  setEnemyDeck: React.Dispatch<React.SetStateAction<Card[]>>,
  enemyHandCards: Card[],
  setEnemyHandCards: React.Dispatch<React.SetStateAction<Card[]>>,
  enemyGraveyard: Card[],
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  enemyFieldCards: (Card & { maxHp: number; canAttack?: boolean })[],
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<(Card & { maxHp: number; canAttack?: boolean })[]>>,
  enemyMaxMana: number,
  setEnemyMaxMana: React.Dispatch<React.SetStateAction<number>>,
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>
) {
  // 敵のターン開始: ドロー
  if (enemyDeck.length > 0) {
    const card = { ...enemyDeck[0], uniqueId: uuidv4() };
    setEnemyDeck((prev) => prev.slice(1));
    if (enemyHandCards.length >= 10) {
      setEnemyGraveyard([...enemyGraveyard, card]);
    } else {
      setEnemyHandCards([...enemyHandCards, card]);
    }
  }

  // canAttack設定 & rushInitialTurn フラグをクリア
  setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true, rushInitialTurn: undefined } as any)));

  // (マナ増加は呼び出し元で管理するためここでは行わない)
}

export async function runEnemyTurn(
  enemyHandCards: Card[],
  setEnemyHandCards: React.Dispatch<React.SetStateAction<Card[]>>,
  enemyFieldCards: (Card & { maxHp: number; canAttack?: boolean })[],
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<(Card & { maxHp: number; canAttack?: boolean })[]>>,
  enemyCurrentMana: number,
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>,
  playerFieldCards: (Card & { maxHp: number; canAttack?: boolean })[],
  playerHeroHp: number,
  setPlayerHeroHp: React.Dispatch<React.SetStateAction<number>>,
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<(Card & { maxHp: number; canAttack?: boolean })[]>>,
  setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>,
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>,
  setMovingAttack: React.Dispatch<React.SetStateAction<{ attackerId: string; targetId: string | "hero" } | null>>,
  attack: (attackerId: string, targetId: string | "hero", isPlayerAttacker: boolean) => void,
  endTurn: () => void,
  turnTimeoutRef: React.MutableRefObject<number | null>,
  setEnemyGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  cancelRef: MutableRefObject<boolean>
) {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  try {
    // 少し待ってから行動開始（見た目の余裕）
    await sleep(800);

    if (cancelRef.current) return;

    // 1) プレイフェイズ: コスト効率ベースでフォロワーを出す
    let remainingMana = enemyCurrentMana;
    let fieldCount = enemyFieldCards.length;

    // フォロワー候補を抽出し、効率でソート
    const followerCandidates = enemyHandCards
      .filter((c) => c.type === "follower")
      .map((c) => ({
        card: c,
        score: (c.attack ?? 0) + ((c.hp ?? 0) / 2),
        efficiency: ((c.attack ?? 0) + ((c.hp ?? 0) / 2)) / Math.max(1, c.cost),
      }))
      .sort((a, b) => b.efficiency - a.efficiency);

    for (const entry of followerCandidates) {
      if (cancelRef.current) return;
      const card = entry.card;
      if (card.cost > remainingMana) continue;
      if (fieldCount >= 5) break; // フィールド上限に達したら終了

      // play
      remainingMana -= card.cost;
      fieldCount += 1;
      const animId = uuidv4();
      
      // rush: 出したターン相手フォロワーのみ攻撃可能、superHaste: 出したターンから全対象攻撃可能
      const canAttackInitial = !!(card.rush || card.superHaste);
      const rushInitialTurn = card.rush ? true : undefined;
      
      setEnemyFieldCards((f) => [
        ...f,
        { ...card, maxHp: card.hp ?? 0, canAttack: canAttackInitial, uniqueId: animId, isAnimating: true, rushInitialTurn } as any,
      ]);
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));
      
      // 敵がフォロワーを出した際の召喚効果を簡易的に適用
      if (card.summonEffect && card.summonEffect.type === "damage_all") {
        const dmg = card.summonEffect.value ?? 1;
        // プレイヤーフィールドにダメージ
        setPlayerFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) setPlayerGraveyard((g) => [...g, ...dead.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
        // プレイヤーヒーローにダメージ（勝利判定含む）
        setPlayerHeroHp((hp) => {
          const next = Math.max(hp - dmg, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "enemy" });
            if (turnTimeoutRef.current !== null) {
              clearTimeout(turnTimeoutRef.current as number);
              turnTimeoutRef.current = null;
            }
            return 0;
          }
          return next;
        });
      }
      
      // 召喚時トリガーの発動（例: 魔導士の召喚時に火球を手札に加える）
      if (card.summonTrigger) {
        const trigger = card.summonTrigger;
        if (trigger.type === "add_card_hand" && trigger.cardId) {
          const addCard = cards.find((c) => c.id === trigger.cardId);
          if (addCard) {
            const newCard = { ...addCard, uniqueId: uuidv4() };
            setEnemyHandCards((h) => (h.length < MAX_HAND ? [...h, newCard] : h));
          }
        }
      }
      
      (async () => {
        await sleep(600);
        if (cancelRef.current) return;
        setEnemyFieldCards((list) => list.map((c) => (c.uniqueId === animId ? { ...c, isAnimating: false } : c)));
      })();
      await sleep(600);
      if (cancelRef.current) return;
    }

    // 残ったマナで簡易スペル処理：ダメージ系スペルがあればヒーローに使用する
    // effect ベースでダメージスペルを探す（damage_single / damage_all）
    const damageSpell = enemyHandCards.find(
      (c) => c.type === "spell" && (c.effect === "damage_single" || c.effect === "damage_all") && c.cost <= remainingMana
    );
    if (damageSpell && remainingMana >= damageSpell.cost) {
      // 手札から取り除き、墓地に移動する
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== damageSpell.uniqueId));
      setEnemyGraveyard((g) => [...g, { ...damageSpell, uniqueId: uuidv4() }]);
      remainingMana -= damageSpell.cost;

      // 単体ダメージはヒーロー優先で与える（簡易AI）
      if (damageSpell.effect === "damage_single") {
        const dmg = (damageSpell.name || "").toLowerCase().includes("lightning") || (damageSpell.name || "").includes("雷") ? 4 : 3;
        setPlayerHeroHp((hp) => {
          const next = Math.max(hp - dmg, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "enemy" });
            if (turnTimeoutRef.current !== null) {
              clearTimeout(turnTimeoutRef.current as number);
              turnTimeoutRef.current = null;
            }
            return 0;
          }
          return next;
        });
      } else if (damageSpell.effect === "damage_all") {
        // 全体ダメージ（簡易AIではヒーローに 2 ダメージを与える）
        setPlayerHeroHp((hp) => {
          const next = Math.max(hp - 2, 0);
          if (next <= 0) {
            setGameOver({ over: true, winner: "enemy" });
            if (turnTimeoutRef.current !== null) {
              clearTimeout(turnTimeoutRef.current as number);
              turnTimeoutRef.current = null;
            }
            return 0;
          }
          return next;
        });
      }

      await sleep(600);
      if (cancelRef.current) return;
    }

    // 一括で敵の現在マナを更新
    if (cancelRef.current) return;
    if (remainingMana !== enemyCurrentMana) {
      setEnemyCurrentMana(remainingMana);
    }

    // 2) 攻撃フェイズ: 出せるフォロワーは攻撃
    for (const enemyCard of [...enemyFieldCards]) {
      if (cancelRef.current) return;
      const fresh = enemyFieldCards.find((c) => c.uniqueId === enemyCard.uniqueId);
      if (!fresh || !fresh.canAttack) continue;

      const target = playerFieldCards.length > 0 ? playerFieldCards[0].uniqueId : "hero";
      setMovingAttack({ attackerId: enemyCard.uniqueId, targetId: target });
      await sleep(900);
      attack(enemyCard.uniqueId, target, false);
      await sleep(200);
      setMovingAttack(null);
    }

    // 3) ターン終了
    await sleep(2000);
    if (cancelRef.current) return;
    endTurn();
  } finally {
    setAiRunning(false);
  }
}
