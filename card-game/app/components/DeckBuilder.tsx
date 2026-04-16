"use client";

import React, { useMemo, useState } from "react";
import { cards } from "../data/cards";
import { DeckRole, getDefaultDeckIds } from "../data/deck";
import styles from "../assets/css/Game.Master.module.css";
import {
  getDeckBuilderRules,
  getDeckIdsFromStorage,
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

  const initial = useMemo(() => getDeckIdsFromStorage(role) ?? getDefaultDeckIds(role), [role]);
  const [deckIds, setDeckIds] = useState<number[]>(initial);

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

  const save = () => {
    const result = saveDeckIdsToStorage(role, deckIds);
    if (!result.ok) {
      setMessageType("error");
      setMessage(result.errors[0] ?? "保存に失敗しました。");
      return;
    }
    setMessageType("success");
    setMessage(`${roleLabels[role]}デッキを保存しました。`);
  };

  const resetToDefault = () => {
    setDeckIds(getDefaultDeckIds(role));
    setMessage("");
  };
  const baseActionButtonStyle: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.22)",
    fontWeight: 700,
    fontSize: 14,
  };
  const plusButtonStyle = (disabled: boolean): React.CSSProperties => ({
    cursor: disabled ? "not-allowed" : "pointer",
    minWidth: 34,
    height: 28,
    borderRadius: 8,
    border: disabled ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(138,255,181,0.35)",
    background: disabled ? "rgba(140,140,140,0.2)" : "rgba(138,255,181,0.15)",
    color: disabled ? "rgba(255,255,255,0.35)" : "#d8ffe9",
    fontWeight: 700,
  });
  const cardPoolAddDisabled = (cardId: number, cost: number) => {
    const count = counts.get(cardId) ?? 0;
    const wouldBeCount = count + 1;
    const sameNameLimitByCard = cost >= rules.highCostThreshold ? rules.highCostLimit : rules.sameCardLimit;
    const sameNameLimitBlocked = wouldBeCount > sameNameLimitByCard;
    const deckLimitBlocked = deckIds.length >= rules.deckLimit;
    return sameNameLimitBlocked || deckLimitBlocked;
  };

  return (
    <div
      style={{
        color: "#fff",
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
        height: "calc(75dvh - 24px)",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto auto auto 1fr auto",
        gap: 10,
        boxSizing: "border-box",
        position: "relative",
        padding: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => switchRole("king")}
              disabled={role === "king"}
              style={{
                cursor: role === "king" ? "default" : "pointer",
                padding: "8px 14px",
                borderRadius: 8,
                border: role === "king" ? "1px solid #f0c040" : "1px solid #777",
                background: role === "king" ? "rgba(240, 192, 64, 0.18)" : "rgba(255,255,255,0.05)",
                color: "#fff",
              }}
            >
              王様デッキ
            </button>
            <button
              onClick={() => switchRole("usurper")}
              disabled={role === "usurper"}
              style={{
                cursor: role === "usurper" ? "default" : "pointer",
                padding: "8px 14px",
                borderRadius: 8,
                border: role === "usurper" ? "1px solid #f0c040" : "1px solid #777",
                background: role === "usurper" ? "rgba(240, 192, 64, 0.18)" : "rgba(255,255,255,0.05)",
                color: "#fff",
              }}
            >
              簒奪者デッキ
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowDeckDrawer((v) => !v)}
          style={{
            cursor: "pointer",
            minWidth: 96,
            height: 40,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.25)",
            background: showDeckDrawer ? "rgba(240,192,64,0.22)" : "rgba(255,255,255,0.08)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1,
            padding: "0 10px",
          }}
          title="現在のデッキを表示"
          aria-label="現在のデッキを表示"
        >
          デッキ確認
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.1)" }}>
          現在: {roleLabels[role]}
        </span>
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: remainingSlots === 0 ? "rgba(138,255,181,0.2)" : "rgba(255,255,255,0.1)",
          }}
        >
          枚数: {deckIds.length}/{rules.deckLimit}
        </span>
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: highCostDuplicateViolations > 0 ? "rgba(255,120,120,0.2)" : "rgba(255,255,255,0.1)",
          }}
        >
          高コスト同名制限: {highCostDuplicateViolations > 0 ? "違反あり" : "OK"}
        </span>
      </div>
      <p style={{ margin: 0, opacity: 0.9, fontSize: 13 }}>
        ルール: 同名最大{rules.sameCardLimit}枚・コスト{rules.highCostThreshold}以上の同名は最大{rules.highCostLimit}枚・{rules.deckLimit}枚を超える保存不可
      </p>
      <div
        style={{
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 12,
          padding: 8,
          display: "grid",
          gridTemplateRows: "auto 1fr",
          height: "100dvw",
          maxHeight: "450px",
          minHeight: "250px",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>カード一覧（クリックで追加）</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
            overflowY: "auto",
            minHeight: 0,
            paddingRight: 4,
            alignContent: "start",
          }}
        >
          {roleCards.map((card) => {
            const count = counts.get(card.id) ?? 0;
            const addDisabled = cardPoolAddDisabled(card.id, card.cost);
            return (
              <div
                key={card.id}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: addDisabled ? "rgba(140,140,140,0.22)" : "rgba(255,255,255,0.06)",
                  padding: 6,
                  display: "grid",
                  gap: 6,
                  outline: selectedCardId === card.id ? "1px solid rgba(240,192,64,0.75)" : "none",
                }}
              >
                <div
                  onClick={() => setSelectedCardId(card.id)}
                  style={{
                    cursor: "pointer",
                    width: "100%",
                    aspectRatio: "3 / 4",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.4)",
                  }}
                >
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: addDisabled ? "grayscale(70%) brightness(0.8)" : "none",
                      }}
                    />
                  ) : null}
                </div>
                <div onClick={() => setSelectedCardId(card.id)} style={{ fontSize: 12, minHeight: 34, cursor: "pointer" }}>
                  <div style={{ color: "#f0c040", fontWeight: 700, opacity: addDisabled ? 0.8 : 1 }}>[{card.cost}] {card.name}</div>
                  <div style={{ opacity: addDisabled ? 0.65 : 0.9 }}>所持: {count}枚</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    disabled={count === 0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeCard(card.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      cursor: count === 0 ? "not-allowed" : "pointer",
                      minWidth: 34,
                      height: 28,
                      borderRadius: 8,
                      border: count === 0 ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,170,170,0.35)",
                      background: count === 0 ? "rgba(140,140,140,0.2)" : "rgba(255,138,138,0.15)",
                      color: count === 0 ? "rgba(255,255,255,0.35)" : "#ffe0e0",
                      fontWeight: 700,
                    }}
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
                    style={plusButtonStyle(addDisabled)}
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
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "min(500px, 100vw)",
            height: "100%",
            background: "rgba(10,10,12,0.97)",
            borderLeft: "1px solid rgba(255,255,255,0.2)",
            padding: 12,
            display: "grid",
            gridTemplateRows: "auto auto 1fr",
            gap: 10,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>現在のデッキ</h3>
            <button
              onClick={() => setShowDeckDrawer(false)}
              style={{
                cursor: "pointer",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                padding: "6px 10px",
              }}
            >
              閉じる
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
            {deckPreviewCards.length}/{rules.deckLimit}枚（確認専用）
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", overflowY: "auto", alignContent: "flex-start", paddingRight: 4 }}>
            {deckPreviewCards.map((card, idx) => (
              <div
                key={`${card.id}-${idx}`}
                onClick={() => setSelectedCardId(card.id)}
                style={{
                  cursor: "pointer",
                  width: 82,
                  minWidth: 82,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.06)",
                  padding: 6,
                  color: "#fff",
                  outline: selectedCardId === card.id ? "1px solid rgba(240,192,64,0.75)" : "none",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 4",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.4)",
                  }}
                >
                  {card.image ? (
                    <img src={card.image} alt={card.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {card.name}
                </div>
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                style={{
                  width: 82,
                  minWidth: 82,
                  borderRadius: 10,
                  border: "1px dashed rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12,
                  minHeight: 118,
                }}
              >
                空き
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCard && (
        <div
          onClick={() => setSelectedCardId(null)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 30,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            className={styles.field_card_description}
            data-card-description="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: 520,
              width: "calc(100% - 40px)",
              margin: 0,
              zIndex: 31,
            }}
          >
            <h4>
              [{selectedCard.cost}] {selectedCard.name}
            </h4>
            <p>{selectedCard.description ?? "説明はありません。"}</p>
            {selectedCard.descriptionFormationBonus ? (
              <p className={styles.field_card_description_synergy}>
                <span className={styles.field_card_description_synergy_label_formation}>陣形</span><br />
                {selectedCard.descriptionFormationBonus}
              </p>
            ) : null}
            {selectedCard.descriptionDaggerSynergy ? (
              <p className={styles.field_card_description_synergy}>
                <span className={styles.field_card_description_synergy_label_dagger}>暗器</span><br />
                {selectedCard.descriptionDaggerSynergy}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setSelectedCardId(null)}
              style={{
                marginTop: 8,
                cursor: "pointer",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.28)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                padding: "6px 10px",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 0, flexWrap: "wrap" }}>
        <button
          onClick={save}
          disabled={!canSave}
          style={{
            ...baseActionButtonStyle,
            cursor: canSave ? "pointer" : "not-allowed",
            border: canSave ? "1px solid rgba(138,255,181,0.45)" : "1px solid rgba(255,255,255,0.12)",
            background: canSave ? "linear-gradient(180deg, rgba(138,255,181,0.28), rgba(96,182,133,0.28))" : "rgba(120,120,120,0.25)",
            color: canSave ? "#eafff3" : "rgba(255,255,255,0.45)",
            boxShadow: canSave ? "0 6px 14px rgba(70,140,102,0.25)" : "none",
          }}
        >
          保存
        </button>
        <button
          onClick={resetToDefault}
          style={{
            ...baseActionButtonStyle,
            cursor: "pointer",
            background: "rgba(240,192,64,0.2)",
            border: "1px solid rgba(240,192,64,0.45)",
            color: "#ffe8a8",
          }}
        >
          デフォルトに戻す
        </button>
        <button
          onClick={onBack}
          style={{
            ...baseActionButtonStyle,
            cursor: "pointer",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.28)",
            color: "#f4f4f4",
          }}
        >
          戻る
        </button>
      </div>

      <div style={{ minHeight: 20 }}>
        {errors.length > 0 && (
          <p style={{ color: "#ff8a8a", margin: 0, fontWeight: 700, fontSize: 14 }}>⚠ {errors[0]}</p>
        )}
        {message && (
          <p style={{ color: messageType === "error" ? "#ff8a8a" : "#8affb5", margin: 0, fontWeight: 700, fontSize: 14 }}>{message}</p>
        )}
      </div>

    </div>
  );
};

export default DeckBuilder;
