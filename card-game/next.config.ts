/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: undefined,
  images: {
    // disable built-in optimizer to serve raw files directly;
    // this avoids /_next/image overhead when many cards appear on screen
    unoptimized: true,
  },
};

export default nextConfig;