import type { NextConfig } from "next";

// Security headers for every response. The Content-Security-Policy (with a per-request nonce) is set in
// src/middleware.ts because a static policy would need 'unsafe-inline' for Next.js scripts.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera only for the barcode scanner on our own pages.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdf-parse (pdf.js) breaks when bundled; load it from node_modules at runtime instead.
  serverExternalPackages: ["pdf-parse"],
  // pdf.js loads its worker by path at runtime, which file tracing cannot see. Ship it with the
  // server functions that analyse prescriptions (Netlify functions and `next start`).
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/pdf-parse/dist/**/*", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/*": ["./node_modules/pdf-parse/dist/**/*", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
