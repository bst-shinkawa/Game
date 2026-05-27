/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // 多数のカード画像を直接配信するため最適化を無効にしている
    unoptimized: true,
  },
};

export default nextConfig;