"use client";

import React, { useEffect, useState } from "react";

type Props = {
  onBack: () => void;
};

type ProfileResponse = {
  playerName: string | null;
  lastNameChangedAt: string | null;
};

const ProfileSettings: React.FC<Props> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [lastNameChangedAt, setLastNameChangedAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("success");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/profile/name", { credentials: "include" });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as ProfileResponse;
        if (!mounted) return;
        setPlayerName(data.playerName ?? "");
        setLastNameChangedAt(data.lastNameChangedAt ?? null);
      } catch {
        if (!mounted) return;
        setMessageType("error");
        setMessage("プロフィール取得に失敗しました。");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile/name", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        playerName?: string | null;
        lastNameChangedAt?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setMessageType("error");
        setMessage(data.error ?? "プロフィール更新に失敗しました。");
        return;
      }
      setPlayerName(data.playerName ?? "");
      setLastNameChangedAt(data.lastNameChangedAt ?? null);
      setMessageType("success");
      setMessage("プロフィールを更新しました。");
    } catch {
      setMessageType("error");
      setMessage("通信エラーのため更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const lastChangedLabel = lastNameChangedAt
    ? new Date(lastNameChangedAt).toLocaleString("ja-JP")
    : "未設定";

  return (
    <div
      style={{
        color: "#fff",
        width: "100%",
        maxWidth: 800,
        margin: "0 auto",
        display: "grid",
        gap: 14,
        padding: "10px",
      }}
    >
      <h2 style={{ margin: 0 }}>プロフィール設定</h2>
      <p style={{ margin: 0, color: "#d0d0d0" }}>プレイヤーネームは2〜16文字、24時間に1回まで変更できます。</p>
      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="player-name-input" style={{ fontSize: 13, opacity: 0.92 }}>
          プレイヤーネーム
        </label>
        <input
          id="player-name-input"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="プレイヤーネーム"
          disabled={loading || saving}
          maxLength={32}
          style={{
            height: 40,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.26)",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            padding: "0 12px",
          }}
        />
      </div>
      <p style={{ margin: 0, color: "#d0d0d0", fontSize: 13 }}>最終変更: {lastChangedLabel}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={save}
          disabled={loading || saving}
          style={{
            cursor: loading || saving ? "not-allowed" : "pointer",
            borderRadius: 8,
            border: "1px solid rgba(138,255,181,0.45)",
            background: "rgba(138,255,181,0.18)",
            color: "#eafff3",
            padding: "8px 12px",
            fontWeight: 700,
          }}
        >
          保存
        </button>
        <button
          onClick={onBack}
          style={{
            cursor: "pointer",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.28)",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            padding: "8px 12px",
          }}
        >
          戻る
        </button>
      </div>

      {message ? (
        <p style={{ margin: 0, color: messageType === "error" ? "#ff8a8a" : "#8affb5", fontWeight: 700 }}>{message}</p>
      ) : null}
    </div>
  );
};

export default ProfileSettings;
