import Link from "next/link";

const screens = [
  {
    href: "/dev/screens/title",
    label: "タイトル（メインメニュー）",
    note: "ゲスト選択後の StartMenu",
  },
  {
    href: "/dev/screens/title?variant=entry",
    label: "タイトル（ログイン選択）",
    note: "Google / ゲストの入口",
  },
  {
    href: "/dev/screens/pregame?phase=mulligan",
    label: "ゲーム開始（マリガン）",
    note: "手札交換画面",
  },
  {
    href: "/dev/screens/pregame?phase=coin",
    label: "ゲーム開始（コイントス）",
    note: "先攻後攻の抽選中",
  },
  {
    href: "/dev/screens/pregame?phase=result",
    label: "ゲーム開始（先攻/後攻表示）",
    note: "コイン結果ポップアップ",
  },
];

export default function DevScreensIndexPage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 720,
        padding: 32,
        boxSizing: "border-box",
        color: "#e8e4dc",
        background: "#111",
      }}
    >
      <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Design Mode 用スクリーン一覧</h1>
      <p style={{ margin: "0 0 24px", color: "#aaa", fontSize: 14, lineHeight: 1.6 }}>
        Agents Window のブラウザで開き、<code>Ctrl + Shift + D</code> で Design Mode を有効にしてください。
        要素をクリックして指示すると、エージェントが該当コンポーネントのコードを編集します。
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
        {screens.map((screen) => (
          <li key={screen.href}>
            <Link
              href={screen.href}
              style={{
                display: "block",
                padding: "12px 14px",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                color: "#e8e4dc",
                textDecoration: "none",
              }}
            >
              <strong>{screen.label}</strong>
              <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#999" }}>
                {screen.note} — {screen.href}
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/design-preview"
            style={{
              display: "block",
              padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4,
              color: "#888",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            バトルUIサンドボックス（design-preview）
          </Link>
        </li>
      </ul>
    </div>
  );
}
