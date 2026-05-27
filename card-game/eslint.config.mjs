import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // react-hooks/immutability: フックが返す ref の current を
      // イベントハンドラ内で更新するのは正当なパターン
      "react-hooks/immutability": "off",
      // set-state-in-effect: HP フラッシュ等の意図的な用途を警告どまりに
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
