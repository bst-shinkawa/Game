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
