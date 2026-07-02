"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { cards } from "../data/cards";
import { DeckRole, getDefaultDeckIds } from "../data/deck";
import styles from "../assets/css/Game.Master.module.css";
import {
  fetchDeckIdsFromServer,
  getDeckBuilderRules,
  getDeckIdsFromStorage,
  saveDeckIdsToServer,
  saveDeckIdsToStorage,
  validateDeckIds,
} from "../data/deckBuilder";

type Props = {
  onBack: () => void;
};

const roleLabels: Record<DeckRole, string> = {
  king: "王様",
  usurper: "簒奪者",
};

const DeckBuilder: React.FC<Props> = ({ onBack }) => {
  const [role, setRole] = useState<DeckRole>("king");
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success">("success");
  const [showDeckDrawer, setShowDeckDrawer] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [deckIds, setDeckIds] = useState<number[]>(getDeckIdsFromStorage("king") ?? getDefaultDeckIds("king"));

  const rules = getDeckBuilderRules();

  const roleCards = useMemo(
    () => {
      const allowedIds = new Set(getDefaultDeckIds(role));
      return cards
        .filter((c) => c.owner === role && allowedIds.has(c.id))
        .sort((a, b) => a.cost - b.cost || a.id - b.id);
    },
    [role]
  );

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const id of deckIds) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [deckIds]);

  const errors = useMemo(() => validateDeckIds(deckIds, role), [deckIds, role]);
  const selectedCard = useMemo(
    () => roleCards.find((card) => card.id === selectedCardId) ?? null,
    [roleCards, selectedCardId]
  );
  const highCostDuplicateViolations = useMemo(() => {
    let violations = 0;
    for (const card of roleCards) {
      if (card.cost < rules.highCostThreshold) continue;
      const count = counts.get(card.id) ?? 0;
      if (count > rules.highCostLimit) violations += 1;
    }
    return violations;
  }, [counts, roleCards, rules.highCostThreshold, rules.highCostLimit]);
  const canSave = errors.length === 0;
  const remainingSlots = Math.max(0, rules.deckLimit - deckIds.length);
  const deckPreviewCards = useMemo(
    () => deckIds.map((id) => roleCards.find((card) => card.id === id)).filter((card): card is NonNullable<typeof card> => !!card),
    [deckIds, roleCards]
  );
  const emptySlots = Math.max(0, rules.deckLimit - deckPreviewCards.length);

  const switchRole = (nextRole: DeckRole) => {
    setRole(nextRole);
    setDeckIds(getDeckIdsFromStorage(nextRole) ?? getDefaultDeckIds(nextRole));
    setMessage("");
    setShowDeckDrawer(false);
    setSelectedCardId(null);
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        if (!sessionRes.ok) return;
        const session = (await sessionRes.json()) as { user?: { id?: string } };
        if (!mounted) return;
        const authed = !!session?.user?.id;
        setIsAuthenticated(authed);
        if (!authed) {
          setDeckIds(getDeckIdsFromStorage(role) ?? getDefaultDeckIds(role));
          return;
        }
        const fromServer = await fetchDeckIdsFromServer(role);
        if (!mounted) return;
        setDeckIds(fromServer ?? getDeckIdsFromStorage(role) ?? getDefaultDeckIds(role));
      } catch {
        if (!mounted) return;
        setDeckIds(getDeckIdsFromStorage(role) ?? getDefaultDeckIds(role));
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [role]);

  const addCard = (cardId: number) => {
    setDeckIds((prev) => [...prev, cardId]);
    setMessage("");
  };

  const removeCard = (cardId: number) => {
    setDeckIds((prev) => {
      const index = prev.findIndex((id) => id === cardId);
      if (index < 0) return prev;
      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
    setMessage("");
  };

  const save = async () => {
    if (isAuthenticated) {
      const serverResult = await saveDeckIdsToServer(role, deckIds);
      if (!serverResult.ok) {
        setMessageType("error");
        setMessage(serverResult.error ?? "サーバー保存に失敗しました。");
        return;
      }
      setMessageType("success");
      setMessage(`${roleLabels[role]}デッキを保存しました。（クラウド同期済み）`);
    } else {
      const result = saveDeckIdsToStorage(role, deckIds);
      if (!result.ok) {
        setMessageType("error");
        setMessage(result.errors[0] ?? "保存に失敗しました。");
        return;
      }
      setMessageType("success");
      setMessage(`${roleLabels[role]}デッキを保存しました。（この端末のみ）`);
    }
  };

  const resetToDefault = () => {
    setDeckIds(getDefaultDeckIds(role));
    setMessage("");
  };

  const cardPoolAddDisabled = (cardId: number, cost: number) => {
    const count = counts.get(cardId) ?? 0;
    const wouldBeCount = count + 1;
    const sameNameLimitByCard = cost >= rules.highCostThreshold ? rules.highCostLimit : rules.sameCardLimit;
    const sameNameLimitBlocked = wouldBeCount > sameNameLimitByCard;
    const deckLimitBlocked = deckIds.length >= rules.deckLimit;
    return sameNameLimitBlocked || deckLimitBlocked;
  };

  return (
    <div className={styles.deckBuilder}>
      <div className={styles.deckBuilder__header}>
        <div>
          <div className={styles.deckBuilder__roleGroup}>
            <button
              onClick={() => switchRole("king")}
              disabled={role === "king"}
              className={`${styles.deckBuilder__roleBtn} ${styles["deckBuilder__roleBtn--king"]} ${role === "king" ? styles["deckBuilder__roleBtn--active"] : ""}`}
            >
              王様デッキ
            </button>
            <button
              onClick={() => switchRole("usurper")}
              disabled={role === "usurper"}
              className={`${styles.deckBuilder__roleBtn} ${styles["deckBuilder__roleBtn--usurper"]} ${role === "usurper" ? styles["deckBuilder__roleBtn--active"] : ""}`}
            >
              簒奪者デッキ
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowDeckDrawer((v) => !v)}
          className={`${styles.deckBuilder__deckToggle} ${showDeckDrawer ? styles["deckBuilder__deckToggle--open"] : ""}`}
          title="現在のデッキを表示"
          aria-label="現在のデッキを表示"
        >
          デッキ確認
        </button>
      </div>

      <div className={styles.deckBuilder__stats}>
        <span className={styles.deckBuilder__stat}>現在: {roleLabels[role]}</span>
        <span
          className={`${styles.deckBuilder__stat} ${remainingSlots === 0 ? styles["deckBuilder__stat--full"] : ""}`}
        >
          枚数: {deckIds.length}/{rules.deckLimit}
        </span>
        <span
          className={`${styles.deckBuilder__stat} ${highCostDuplicateViolations > 0 ? styles["deckBuilder__stat--warn"] : ""}`}
        >
          高コスト同名制限: {highCostDuplicateViolations > 0 ? "違反あり" : "OK"}
        </span>
      </div>
      <p className={styles.deckBuilder__rulesNote}>
        ルール: 保存は{rules.deckLimit}枚ちょうどのみ・同名最大{rules.sameCardLimit}枚・コスト{rules.highCostThreshold}以上の同名は最大{rules.highCostLimit}枚
      </p>
      <div className={styles.deckBuilder__pool}>
        <h3 className={styles.deckBuilder__poolTitle}>カード一覧（クリックで追加）</h3>
        <div className={styles.deckBuilder__poolGrid}>
          {roleCards.map((card) => {
            const count = counts.get(card.id) ?? 0;
            const addDisabled = cardPoolAddDisabled(card.id, card.cost);
            return (
              <div
                key={card.id}
                className={`${styles.deckBuilder__card} ${addDisabled ? styles["deckBuilder__card--disabled"] : ""} ${selectedCardId === card.id ? styles["deckBuilder__card--selected"] : ""}`}
              >
                <div
                  onClick={() => setSelectedCardId(card.id)}
                  className={`${styles.deckBuilder__cardThumb} ${addDisabled ? styles["deckBuilder__cardThumb--dimmed"] : ""}`}
                >
                  {card.image ? (
                    <Image
                      src={card.image}
                      alt={card.name}
                      fill
                      unoptimized
                      style={{ objectFit: "cover" }}
                    />
                  ) : null}
                </div>
                <div onClick={() => setSelectedCardId(card.id)} className={styles.deckBuilder__cardMeta}>
                  <div className={styles.deckBuilder__cardCost}>
                    [{card.cost}] {card.name}
                  </div>
                  <div className={styles.deckBuilder__cardCount}>所持: {count}枚</div>
                </div>
                <div className={styles.deckBuilder__cardActions}>
                  <button
                    type="button"
                    disabled={count === 0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeCard(card.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`${styles.deckBuilder__countBtn} ${styles["deckBuilder__countBtn--minus"]}`}
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addCard(card.id);
                    }}
                    disabled={addDisabled}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`${styles.deckBuilder__countBtn} ${styles["deckBuilder__countBtn--plus"]}`}
                    title={addDisabled ? "上限のため追加できません" : "1枚追加"}
                  >
                    +1
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showDeckDrawer && (
        <div className={styles.deckBuilder__drawer}>
          <div className={styles.deckBuilder__drawerHeader}>
            <h3 className={styles.deckBuilder__drawerTitle}>現在のデッキ</h3>
            <button onClick={() => setShowDeckDrawer(false)} className={styles.deckBuilder__drawerClose}>
              閉じる
            </button>
          </div>
          <p className={styles.deckBuilder__drawerNote}>
            {deckPreviewCards.length}/{rules.deckLimit}枚（確認専用）
          </p>
          <div className={styles.deckBuilder__drawerGrid}>
            {deckPreviewCards.map((card, idx) => (
              <div
                key={`${card.id}-${idx}`}
                onClick={() => setSelectedCardId(card.id)}
                className={`${styles.deckBuilder__deckSlot} ${selectedCardId === card.id ? styles["deckBuilder__deckSlot--selected"] : ""}`}
              >
                <div className={styles.deckBuilder__deckSlotThumb}>
                  {card.image ? (
                    <Image src={card.image} alt={card.name} fill unoptimized style={{ objectFit: "cover" }} />
                  ) : null}
                </div>
                <div className={styles.deckBuilder__deckSlotName}>{card.name}</div>
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, idx) => (
              <div key={`empty-${idx}`} className={styles.deckBuilder__deckSlotEmpty}>
                空き
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCard && (
        <div onClick={() => setSelectedCardId(null)} className={styles.deckBuilder__overlay}>
          <div
            className={`${styles.field_card_description} ${styles.deckBuilder__overlayPanel}`}
            data-card-description="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h4>
              [{selectedCard.cost}] {selectedCard.name}
            </h4>
            <p>{selectedCard.description ?? "説明はありません。"}</p>
            {selectedCard.descriptionFormationBonus ? (
              <p className={styles.field_card_description_synergy}>
                <span className={styles.field_card_description_synergy_label_formation}>陣形</span>
                <br />
                {selectedCard.descriptionFormationBonus}
              </p>
            ) : null}
            {selectedCard.descriptionDaggerSynergy ? (
              <p className={styles.field_card_description_synergy}>
                <span className={styles.field_card_description_synergy_label_dagger}>暗器</span>
                <br />
                {selectedCard.descriptionDaggerSynergy}
              </p>
            ) : null}
            <button type="button" onClick={() => setSelectedCardId(null)} className={styles.deckBuilder__overlayClose}>
              閉じる
            </button>
          </div>
        </div>
      )}

      <div className={styles.deckBuilder__footer}>
        <button
          onClick={save}
          disabled={!canSave}
          className={`${styles.deckBuilder__btn} ${styles["deckBuilder__btn--save"]}`}
        >
          保存
        </button>
        <button
          onClick={resetToDefault}
          className={`${styles.deckBuilder__btn} ${styles["deckBuilder__btn--reset"]}`}
        >
          デフォルトに戻す
        </button>
        <button onClick={onBack} className={`${styles.deckBuilder__btn} ${styles["deckBuilder__btn--back"]}`}>
          戻る
        </button>
      </div>

      <div className={styles.deckBuilder__messages}>
        {errors.length > 0 && <p className={styles.deckBuilder__error}>⚠ {errors[0]}</p>}
        {message && (
          <p
            className={`${styles.deckBuilder__message} ${messageType === "error" ? styles["deckBuilder__message--error"] : styles["deckBuilder__message--success"]}`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default DeckBuilder;
