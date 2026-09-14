import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.HEN_E2E_BUILD === "1" ? ".next-e2e" : ".next",
  turbopack: { root: process.cwd() },
};
export default config;
