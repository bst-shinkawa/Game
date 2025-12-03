import { v4 as uuidv4 } from "uuid";
import type { Card } from "./cards";
import { cards } from "./cards";
import type { MutableRefObject } from "react";

const MAX_MANA = 10;
const MAX_HAND = 10;

// 盤面評価関数: 現在の盤面状況を数値で評価
export function evaluateBoardState({
  enemyFieldCards,
  enemyHandCards,
  enemyHeroHp,
  enemyCurrentMana,
  playerFieldCards,
  playerHandCards,
  playerHeroHp,
  playerCurrentMana
}: {
  enemyFieldCards: Card[];
  enemyHandCards: Card[];
  enemyHeroHp: number;
  enemyCurrentMana: number;
  playerFieldCards: Card[];
  playerHandCards: Card[];
  playerHeroHp: number;
  playerCurrentMana: number;
}) {
  // シンプルな評価例: HP・盤面・手札・マナの合計値
  const enemyScore =
    enemyHeroHp * 2 +
    enemyCurrentMana +
    enemyFieldCards.reduce((sum, c) => sum + (c.attack ?? 0) + (c.hp ?? 0), 0) +
    enemyHandCards.length * 1.5;
  const playerScore =
    playerHeroHp * 2 +
    playerCurrentMana +
    playerFieldCards.reduce((sum, c) => sum + (c.attack ?? 0) + (c.hp ?? 0), 0) +
    playerHandCards.length * 1.5;
  // AIは自分のスコアが高いほど有利と判断
  return enemyScore - playerScore;
}

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
    // use functional updates to prevent race conditions with hand size
    setEnemyHandCards((prev) => {
      if (prev.length >= MAX_HAND) {
        setEnemyGraveyard((gPrev) => [...gPrev, card]);
        return prev;
      }
      return [...prev, card];
    });
  }

  // canAttack設定 & rushInitialTurn フラグをクリア
  setEnemyFieldCards((prev) => prev.map((c) => ({ ...c, canAttack: true, rushInitialTurn: undefined })));

  // (マナ増加は呼び出し元で管理するためここでは行わない)
}

export async function runEnemyTurn(
  enemyHandCards: Card[],
  setEnemyHandCards: React.Dispatch<React.SetStateAction<Card[]>>,
  enemyFieldCards: (Card & { maxHp: number; canAttack?: boolean })[],
  setEnemyFieldCards: React.Dispatch<React.SetStateAction<(Card & { maxHp: number; canAttack?: boolean })[]>>,
  enemyCurrentMana: number,
  setEnemyCurrentMana: React.Dispatch<React.SetStateAction<number>>,
  enemyHeroHp: number,
  playerFieldCards: (Card & { maxHp: number; canAttack?: boolean })[],
  playerHeroHp: number,
  setPlayerHeroHp: React.Dispatch<React.SetStateAction<number>>,
  setPlayerFieldCards: React.Dispatch<React.SetStateAction<(Card & { maxHp: number; canAttack?: boolean })[]>>,
  setPlayerGraveyard: React.Dispatch<React.SetStateAction<Card[]>>,
  setGameOver: React.Dispatch<React.SetStateAction<{ over: boolean; winner: null | "player" | "enemy" }>>,
  setAiRunning: React.Dispatch<React.SetStateAction<boolean>>,
  setMovingAttack: React.Dispatch<React.SetStateAction<{ attackerId: string; targetId: string | "hero" } | null>>,
  setEnemyAttackAnimation: React.Dispatch<React.SetStateAction<{ sourceCardId: string | null; targetId: string | "hero" } | null>>,
  setEnemySpellAnimation: React.Dispatch<React.SetStateAction<{ targetId: string | "hero"; effect: string } | null>>,
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

    // DEBUG: プレイヤーフィールドの状態を確認
    console.log('[Enemy AI] Player field cards:', playerFieldCards.map(c => ({ name: c.name, hp: c.hp, attack: c.attack })));

    // このターン開始時のフィールドにいたカードIDを記録しておく（召喚されたカードは除外）
    const fieldAtTurnStartIds = enemyFieldCards.map((c) => c.uniqueId);

    // リーサル狙い: プレイヤーHPが5以下なら、攻撃・スペルで勝利を優先
    const lethalThreshold = 5;
    let isLethalTurn = playerHeroHp <= lethalThreshold;
    if (isLethalTurn) {
      let remainingMana = enemyCurrentMana;
      let lethalSpell = enemyHandCards.find(
        (c) => c.type === "spell" && (c.effect === "damage_single" || c.effect === "damage_all") && c.cost <= remainingMana
      );
      while (lethalSpell && remainingMana >= lethalSpell.cost) {
        setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== lethalSpell!.uniqueId));
        setEnemyGraveyard((g) => [...g, { ...lethalSpell!, uniqueId: uuidv4() }]);
        remainingMana -= lethalSpell.cost;
        let dmg = lethalSpell.effect === "damage_single" ? ((lethalSpell.name || "").toLowerCase().includes("lightning") ? 4 : 3) : 2;
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
        await sleep(600);
        if (cancelRef.current) return;
        lethalSpell = enemyHandCards.find(
          (c) => c.type === "spell" && (c.effect === "damage_single" || c.effect === "damage_all") && c.cost <= remainingMana
        );
      }
    }

    // 1) プレイフェイズ: 守備的行動の判定
    let remainingMana = enemyCurrentMana;
    let fieldCount = enemyFieldCards.length;

    // 守備的行動判定: HPが低い or 盤面不利なら回復・壁カード優先
    const DEFENSIVE_HP_THRESHOLD = 15;
    const BOARD_DISADVANTAGE_THRESHOLD = -10;
    let isDefensiveTurn = false;
    // HPが低い
    if (enemyHeroHp <= DEFENSIVE_HP_THRESHOLD) isDefensiveTurn = true;
    // 盤面評価で大きく不利
    const boardScore = evaluateBoardState({
      enemyFieldCards,
      enemyHandCards,
      enemyHeroHp,
      enemyCurrentMana,
      playerFieldCards,
      playerHandCards: [],
      playerHeroHp,
      playerCurrentMana: 0
    });
    if (boardScore < BOARD_DISADVANTAGE_THRESHOLD) isDefensiveTurn = true;

    // フォロワー候補を抽出し、効率でソート＋ランダム分岐
    let followerCandidates = enemyHandCards
      .filter((c) => c.type === "follower")
      .map((c) => ({
        card: c,
        score: (c.attack ?? 0) + ((c.hp ?? 0) / 2),
        efficiency: ((c.attack ?? 0) + ((c.hp ?? 0) / 2)) / Math.max(1, c.cost),
      }));
    // 50%の確率で効率順、50%の確率でランダム順
    if (Math.random() < 0.5) {
      followerCandidates = followerCandidates.sort((a, b) => {
        if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
        return b.score - a.score;
      });
    } else {
      followerCandidates = followerCandidates.sort(() => Math.random() - 0.5);
    }

    // フォロワーをマナが尽きるまで複数枚出す
    const localSummoned: (Card & { maxHp: number; canAttack?: boolean; uniqueId: string; isAnimating?: boolean; rushInitialTurn?: boolean })[] = [];

    while (remainingMana > 0 && fieldCount < 5 && followerCandidates.length > 0) {
      // 守備的ターンなら壁カード（HP高・守備系効果）優先
      let entry;
      if (isDefensiveTurn) {
        // HP高い順 or effect: guard, shield, heal など
        const wallCandidates = followerCandidates.filter(e => (e.card.hp ?? 0) >= 5 || ["guard","shield","heal"].includes(e.card.effect ?? ""));
        entry = wallCandidates.find(e => e.card.cost <= remainingMana) || followerCandidates.find(e => e.card.cost <= remainingMana);
      } else {
        // 70%の確率でコスト効率優先、30%でランダム選択
        if (Math.random() < 0.7) {
          entry = followerCandidates.find(e => e.card.cost <= remainingMana);
        } else {
          const affordable = followerCandidates.filter(e => e.card.cost <= remainingMana);
          entry = affordable.length > 0 ? affordable[Math.floor(Math.random() * affordable.length)] : undefined;
        }
      }
      if (!entry) break;
      const card = entry.card;
      remainingMana -= card.cost;
      fieldCount += 1;
      const animId = uuidv4();
      const canAttackInitial = !!(card.rush || card.superHaste);
      const rushInitialTurn = card.rush ? true : undefined;
      const created = { ...card, maxHp: card.hp ?? 0, canAttack: canAttackInitial, uniqueId: animId, isAnimating: true, rushInitialTurn } as any;
      // ローカル配列にも追加して、直後の攻撃フェイズで参照できるようにする
      localSummoned.push(created);
      setEnemyFieldCards((f) => [
        ...f,
        created,
      ]);
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== card.uniqueId));
      followerCandidates = followerCandidates.filter(e => e.card.uniqueId !== card.uniqueId);
      // 召喚効果・トリガーは元のまま
      if (card.summonEffect && card.summonEffect.type === "damage_all") {
        const dmg = card.summonEffect.value ?? 1;
        setPlayerFieldCards((list) => {
          const updated = list.map((c) => ({ ...c, hp: (c.hp ?? 0) - dmg }));
          const dead = updated.filter((c) => (c.hp ?? 0) <= 0);
          if (dead.length) setPlayerGraveyard((g) => [...g, ...dead.filter(d => !g.some(x => x.uniqueId === d.uniqueId))]);
          return updated.filter((c) => (c.hp ?? 0) > 0);
        });
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

    // スペルも複数枚使う（優先度順で使えるだけ使う）
    let spellCandidates = enemyHandCards.filter((c) => c.type === "spell" && c.cost <= remainingMana);
    const spellPriority = ["poison", "freeze_single", "damage_single", "damage_all", "heal_single"];
    while (remainingMana > 0 && spellCandidates.length > 0) {
      // 50%の確率で優先度順、50%でランダム順
      let priorityOrder = Math.random() < 0.5;
      let spell: Card | undefined;
      for (const type of (priorityOrder ? spellPriority : spellPriority.sort(() => Math.random() - 0.5))) {
        // 守備的ターンならヒール優先
        if (isDefensiveTurn && type === "heal_single") {
          spell = spellCandidates.find(c => c.effect === "heal_single" && c.cost <= remainingMana);
          if (spell) {
            setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== spell!.uniqueId));
            setEnemyGraveyard((g) => [...g, { ...spell!, uniqueId: uuidv4() }]);
            remainingMana -= spell.cost;
            await sleep(600);
            if (cancelRef.current) return;
            break;
          }
        }
        if (type === "poison" && playerFieldCards.length > 0) {
          let target: Card | undefined;
          if (Math.random() < 0.7) {
            target = playerFieldCards.reduce((best, c) => (c.hp ?? 0) > (best.hp ?? 0) ? c : best);
          } else {
            target = playerFieldCards[Math.floor(Math.random() * playerFieldCards.length)];
          }
          spell = spellCandidates.find(c => c.effect === "poison" && c.cost <= remainingMana);
          if (spell && target) {
            setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== spell!.uniqueId));
            setEnemyGraveyard((g) => [...g, { ...spell!, uniqueId: uuidv4() }]);
            remainingMana -= spell.cost;
            setPlayerFieldCards((list) =>
              list.map((c) =>
                c.uniqueId === target!.uniqueId
                  ? {
                      ...c,
                      poison: ((c as { poison?: number }).poison ?? 0) + 2,
                      poisonDamage: (spell!.effectValue ?? 1) as number
                    }
                  : c
              )
            );
            await sleep(600);
            if (cancelRef.current) return;
            break;
          }
        } else if (type === "freeze_single" && playerFieldCards.length > 0) {
          let target: Card | undefined;
          if (Math.random() < 0.7) {
            target = playerFieldCards.reduce((best, c) => (c.attack ?? 0) > (best.attack ?? 0) ? c : best);
          } else {
            target = playerFieldCards[Math.floor(Math.random() * playerFieldCards.length)];
          }
          spell = spellCandidates.find(c => c.effect === "freeze_single" && c.cost <= remainingMana);
          if (spell && target) {
            setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== spell!.uniqueId));
            setEnemyGraveyard((g) => [...g, { ...spell!, uniqueId: uuidv4() }]);
            remainingMana -= spell.cost;
            setPlayerFieldCards((list) =>
              list.map((c) =>
                c.uniqueId === target!.uniqueId
                  ? { ...c, frozen: spell!.statusDuration ?? 2, canAttack: false }
                  : c
              )
            );
            await sleep(600);
            if (cancelRef.current) return;
            break;
          }
        } else {
          if (Math.random() < 0.6) {
            spell = spellCandidates.find(c => c.effect === type && c.cost <= remainingMana);
          } else {
            const affordable = spellCandidates.filter(c => c.cost <= remainingMana);
            spell = affordable.length > 0 ? affordable[Math.floor(Math.random() * affordable.length)] : undefined;
          }
          if (spell) {
            setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== spell!.uniqueId));
            setEnemyGraveyard((g) => [...g, { ...spell!, uniqueId: uuidv4() }]);
            remainingMana -= spell.cost;
            await sleep(600);
            if (cancelRef.current) return;
            break;
          }
        }
      }
      spellCandidates = spellCandidates.filter(c => c.cost <= remainingMana);
    }

    // 残ったマナで簡易スペル処理
    let usedSpell: Card | null = null;

    // ダメージ系スペル (damage_single を優先)
    const damageSingleSpell = enemyHandCards.find(
      (c) => c.type === "spell" && c.effect === "damage_single" && c.cost <= remainingMana
    );
    if (damageSingleSpell && remainingMana >= damageSingleSpell.cost) {
      usedSpell = damageSingleSpell;
      setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== damageSingleSpell.uniqueId));
      setEnemyGraveyard((g) => [...g, { ...damageSingleSpell, uniqueId: uuidv4() }]);
      remainingMana -= damageSingleSpell.cost;

      setEnemySpellAnimation({ targetId: "hero", effect: "damage_single" });
      await sleep(300);

      const dmg = (damageSingleSpell.name || "").toLowerCase().includes("lightning") || (damageSingleSpell.name || "").includes("雷") ? 4 : 3;
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
      setEnemySpellAnimation(null);
      await sleep(600);
      if (cancelRef.current) return;
    }

    // ダメージ系スペル (damage_all)
    if (!usedSpell) {
      const damageAllSpell = enemyHandCards.find(
        (c) => c.type === "spell" && c.effect === "damage_all" && c.cost <= remainingMana
      );
      if (damageAllSpell && remainingMana >= damageAllSpell.cost) {
        usedSpell = damageAllSpell;
        setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== damageAllSpell.uniqueId));
        setEnemyGraveyard((g) => [...g, { ...damageAllSpell, uniqueId: uuidv4() }]);
        remainingMana -= damageAllSpell.cost;

        setEnemySpellAnimation({ targetId: "hero", effect: "damage_all" });
        await sleep(300);

        const dmg = 2;
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
        setEnemySpellAnimation(null);
        await sleep(600);
        if (cancelRef.current) return;
      }
    }

    // ポイズン系スペル (poison)
    if (!usedSpell) {
      const poisonSpell = enemyHandCards.find(
        (c) => c.type === "spell" && c.effect === "poison" && c.cost <= remainingMana
      );
      if (poisonSpell && remainingMana >= poisonSpell.cost && playerFieldCards.length > 0) {
        usedSpell = poisonSpell;
        setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== poisonSpell.uniqueId));
        setEnemyGraveyard((g) => [...g, { ...poisonSpell, uniqueId: uuidv4() }]);
        remainingMana -= poisonSpell.cost;

        const targetCard = playerFieldCards[0];
        setPlayerFieldCards((list) =>
          list.map((c) =>
            c.uniqueId === targetCard.uniqueId
              ? { ...c, poison: ((c as { poison?: number }).poison ?? 0) + 2, poisonDamage: 1 }
              : c
          )
        );
        await sleep(600);
        if (cancelRef.current) return;
      }
    }

    // 凍結系スペル (freeze)
    if (!usedSpell) {
      const freezeSpell = enemyHandCards.find(
        (c) => c.type === "spell" && c.effect === "freeze_single" && c.cost <= remainingMana
      );
      if (freezeSpell && remainingMana >= freezeSpell.cost && playerFieldCards.length > 0) {
        usedSpell = freezeSpell;
        setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== freezeSpell.uniqueId));
        setEnemyGraveyard((g) => [...g, { ...freezeSpell, uniqueId: uuidv4() }]);
        remainingMana -= freezeSpell.cost;

        const targetCard = playerFieldCards[0];
        setPlayerFieldCards((list) =>
          list.map((c) =>
            c.uniqueId === targetCard.uniqueId
              ? { ...c, frozen: 2, canAttack: false }
              : c
          )
        );
        await sleep(600);
        if (cancelRef.current) return;
      }
    }

    // ヒール系スペル (heal)
    if (!usedSpell) {
      const healSpell = enemyHandCards.find(
        (c) => c.type === "spell" && c.effect === "heal_single" && c.cost <= remainingMana
      );
      if (healSpell && remainingMana >= healSpell.cost) {
        usedSpell = healSpell;
        setEnemyHandCards((h) => h.filter((c) => c.uniqueId !== healSpell.uniqueId));
        setEnemyGraveyard((g) => [...g, { ...healSpell, uniqueId: uuidv4() }]);
        remainingMana -= healSpell.cost;
        await sleep(600);
        if (cancelRef.current) return;
      }
    }

    // 敵の現在マナを更新
    if (cancelRef.current) return;
    if (remainingMana !== enemyCurrentMana) {
      setEnemyCurrentMana(remainingMana);
    }

    // 2) 攻撃フェーズ: 敵フォロワーが攻撃可能な場合は戦略的に攻撃
    // 注: 攻撃ループ中、フィールドが更新される可能性があるため、
    // 各反復で最新のフィールド状態を参照する必要があります
    const executeAttacks = async () => {
      // まずフィールドの canAttack を強制的に有効化してから攻撃ループへ
      let latestField: (Card & { maxHp: number; canAttack?: boolean; uniqueId: string })[] = [];
      setEnemyFieldCards((prev) => {
        latestField = prev.map((c) => {
          // ターン開始時に既に場にいたカードは攻撃可能にする。
          // ただし新たに召喚されたカード（fieldAtTurnStartIds に含まれないもの）は
          // 突進や superHaste を持つ場合のみ攻撃可能にする。
          const wasOnFieldAtStart = fieldAtTurnStartIds.includes(c.uniqueId);
          const allowAttack = wasOnFieldAtStart || !!(c as any).rushInitialTurn || !!c.superHaste || !!c.rush;
          return { ...c, canAttack: allowAttack };
        });
        return latestField;
      });

      // 状態更新が反映されるのを少し待つ
      await sleep(60);

      // 最新のフィールド状態（setter 内で得た latestField）とローカル召喚を組み合わせて攻撃候補リストを作成
      const attackList = [...latestField, ...localSummoned].filter(Boolean) as (Card & { maxHp: number; canAttack?: boolean; uniqueId: string })[];

      console.log('[Enemy AI] Attack phase - Candidate list after forcing canAttack:', attackList.map(c => ({ name: c.name, canAttack: c.canAttack })));

      for (const enemyCard of attackList) {
        if (cancelRef.current) return;
        // 攻撃対象の選択：canAttack と rushInitialTurn に基づいてヒーロー攻撃可否を判定する
        if (!enemyCard.canAttack) {
          console.log('[Enemy AI] Skipping attack - Card', enemyCard.name, 'cannot attack (canAttack=false)');
          continue;
        }

        const hasWallGuardOnPlayer = playerFieldCards.some((c) => (c as any).wallGuard);
        const attackerCannotHitHeroDueToRush = !!(enemyCard as any).rushInitialTurn;
        const allowHeroTarget = !attackerCannotHitHeroDueToRush && !hasWallGuardOnPlayer;

        let target: string | "hero" | null = null;

        // まずプレイヤーフィールドをターゲット候補にする（ある場合は優先でフォロワーを殴る）
        if (playerFieldCards.length > 0) {
          if (Math.random() < 0.6) {
            const mostThreatened = playerFieldCards.reduce((best, c) => {
              const bestScore = ((best.attack ?? 0) * 2 + (best.hp ?? 0)) + (best.effect ? 1.5 : 0);
              const cScore = ((c.attack ?? 0) * 2 + (c.hp ?? 0)) + (c.effect ? 1.5 : 0);
              return cScore > bestScore ? c : best;
            });
            target = mostThreatened.uniqueId;
          } else {
            target = playerFieldCards[Math.floor(Math.random() * playerFieldCards.length)].uniqueId;
          }
        }

        // プレイヤーフィールドが空ならヒーローを狙うが、ヒーロー攻撃が許可されている場合のみ
        if (!target) {
          if (allowHeroTarget) target = 'hero';
          else {
            console.log('[Enemy AI] Skipping attack - Card', enemyCard.name, 'cannot target hero and no followers available');
            continue;
          }
        } else {
          // もし選ばれたターゲットがヒーロー（ここで可能性は低いが）で、攻撃不可ならフォロワーにフォールバック
          if (target === 'hero' && !allowHeroTarget) {
            if (playerFieldCards.length > 0) {
              target = playerFieldCards[Math.floor(Math.random() * playerFieldCards.length)].uniqueId;
            } else {
              console.log('[Enemy AI] Skipping attack - Card', enemyCard.name, 'cannot target hero and no followers available');
              continue;
            }
          }
        }

        console.log('[Enemy AI] Attacking with:', enemyCard.name, 'canAttack:', enemyCard.canAttack, 'rushInitialTurn:', (enemyCard as any).rushInitialTurn, 'target:', target === 'hero' ? 'HERO' : target);

        // React state と内部 localSummoned の同期確保：攻撃直前に実際の enemyFieldCards にも canAttack=true を反映する
        setEnemyFieldCards((prev) => prev.map((c) => (c.uniqueId === enemyCard.uniqueId ? { ...c, canAttack: true } : c)));
        // 少し待って state が反映されるのを待機
        await sleep(40);

        setMovingAttack({ attackerId: enemyCard.uniqueId, targetId: target as any });
        setEnemyAttackAnimation({ sourceCardId: enemyCard.uniqueId, targetId: target as any });
        // 少し待ってから攻撃の状態更新を行い、HP 変化を早めに反映させる（見た目の遅延を減らす）
        await sleep(50);

        attack(enemyCard.uniqueId, target as any, false);
        // アニメーションの残り時間を待つ
        await sleep(850);
        setMovingAttack(null);
        setEnemyAttackAnimation(null);
      }
    };

    await executeAttacks();

    // 3) ターン終了
    // ターン終了前にフェード演出を追加
    await sleep(1000);
    if (cancelRef.current) return;
    // スクリーンフェード効果を視覚的に表現（黒いオーバーレイの追加など）
    // 実装は GameField や Game.tsx 側で行う
    await sleep(1000);
    if (cancelRef.current) return;
    endTurn();
  } finally {
    setAiRunning(false);
  }
}
