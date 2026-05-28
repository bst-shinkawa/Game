import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppViewport from "./components/AppViewport";
import ErrorBoundary from "./components/ErrorBoundary";
import { GameProvider } from "./context/GameContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Usurper's Gambit",
  description: "王様と簒奪者が戦うターン制カードゲーム",
  // iOS でホーム画面に追加 → standalone（全画面）起動を可能にする
  // Next.js が apple-mobile-web-app-capable と apple-mobile-web-app-title を自動付与する
  appleWebApp: {
    capable: true,
    title: "Usurper",
    // default: status bar を白文字で表示（背景色は theme_color）。
    // black-translucent は notch 周りでコンテンツが status bar の下に潜る挙動になり
    // safe-area-inset と組み合わせないとレイアウトが崩れるため安全な default を採用。
    statusBarStyle: "default",
  },
  // Android Chrome / Edge 用に mobile-web-app-capable も付与
  other: {
    "mobile-web-app-capable": "yes",
  },
};

// iOS Safari でのズーム・アドレスバー変動・safe-area を制御するビューポート設定
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // iOS 15+ でキーボード/ホームバー出現時に layout viewport を変えさせない
  interactiveWidget: "resizes-visual",
  // standalone モードの status bar 領域背景色
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GameProvider>
          {/* 16:9 固定スケーリングのラッパー */}
          <div id="app-viewport-root">
            <AppViewport>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </AppViewport>
          </div>
        </GameProvider>
      </body>
    </html>
  );
}
