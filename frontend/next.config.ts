import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  reactCompiler: true,
  images: {
    unoptimized: true, // 静的書き出し時は画像の最適化をオフにする必要があります
  },
};

export default nextConfig;
