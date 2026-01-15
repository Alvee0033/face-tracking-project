import type { NextConfig } from "next";

// Use static export for Firebase Hosting, SSR for local development
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Uncomment below for Firebase deployment (static export)
  // output: 'export',
  compiler: {
    removeConsole: isProduction,
  },
  // Disable Image Optimization for static export when using 'output: export'
  // images: {
  //   unoptimized: true,
  // },
};

export default nextConfig;
