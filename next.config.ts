import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (pdf.js) breaks when bundled; load it from node_modules at runtime instead.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
