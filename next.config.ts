import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this repo, so a package-lock.json in a parent folder doesn't confuse Turbopack.
  turbopack: { root: process.cwd() },
  // Datasets and graph files are read from disk at runtime; ship them with the serverless functions (Vercel).
  outputFileTracingIncludes: { "/**": ["./data/**/*"] },
  // `./start.sh --lan` sets this, so the dev server also works (hot reload) when opened by LAN address.
  allowedDevOrigins: (process.env.PLAYPEN_DEV_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
};

export default nextConfig;
