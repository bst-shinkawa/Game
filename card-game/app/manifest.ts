import type { MetadataRoute } from "next";

/**
 * PWA マニフェスト。
 * iOS Safari でホーム画面に追加すると standalone 起動になり、
 * - 全画面（Safari の URL バー・ツールバーが消える）
 * - 左右エッジスワイプによるタブ切替・戻る/進むジェスチャが無効化
 * される。横向きカードゲームのプレイ環境としては実質これが必須。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Usurper's Gambit",
    short_name: "Usurper",
    description: "王様と簒奪者が戦うターン制カードゲーム",
    start_url: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/img/front/title_logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/img/front/title_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
