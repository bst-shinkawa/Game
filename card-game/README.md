# Usurper's Gambit

王様と簒奪者が戦うターン制カードゲーム。Next.js 16 + React 19 + TypeScript で実装。

## 技術スタック

| 分類 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| UI | React 19, Framer Motion |
| 認証 | NextAuth.js v4 (Google OAuth) |
| データ永続化 | Vercel KV (本番) / ローカルファイル (開発時) |
| スタイリング | CSS Modules |
| テスト | Vitest |
| リント | ESLint (flat config) |

## ローカル開発手順

### 1. 依存パッケージのインストール

```bash
cd card-game
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、各値を設定します。

```bash
cp .env.example .env.local
```

| 変数名 | 説明 |
|--------|------|
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` で生成 |
| `AUTH_GOOGLE_ID` | Google Cloud Console の OAuth クライアント ID |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console の OAuth クライアントシークレット |

### 3. 開発サーバー起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## スクリプト一覧

```bash
npm run dev        # Turbopack 開発サーバー
npm run build      # 本番ビルド
npm run start      # 本番サーバー起動
npm run lint       # ESLint 実行
npm run test       # Vitest 実行（1回）
npm run test:watch # Vitest ウォッチモード
```

## ゲームルール概要

- **先攻**：王様デッキを使用
- **後攻**：簒奪者デッキを使用

### 勝利条件

| 役割 | 通常 | 特殊 |
|------|------|------|
| 王様 | 敵HPを0にする | 10ラウンド耐久 / 場に3体以上を合計5回達成 |
| 簒奪者 | 敵HPを0にする | 10ラウンド以内に撃破 / 王の手札を0枚にする |

## Vercel へのデプロイ

1. Vercel ダッシュボードでプロジェクトを作成
2. **Environment Variables** に上記の環境変数を設定
3. ユーザーデータ永続化のため **Vercel KV** を Storage タブから追加
   - 追加すると `KV_REST_API_URL` / `KV_REST_API_TOKEN` が自動設定されます

## ディレクトリ構成

```
app/
├── components/   # UI コンポーネント
├── context/      # React Context (GameContext)
├── data/         # カード・デッキ・AI データ
├── hooks/        # カスタムフック
├── lib/          # 汎用ユーティリティ (logger, seededRandom, playerName)
├── services/     # ゲームロジックサービス
├── types/        # TypeScript 型定義
└── api/          # Next.js API Routes
```
