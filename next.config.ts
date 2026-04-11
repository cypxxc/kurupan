import { createHash } from "node:crypto";
import type { NextConfig } from "next";

import { isProductionEnvironment } from "./src/lib/env/safety";
import { themeInitScript } from "./src/lib/theme-init-script";

const themeInitScriptHash = createHash("sha256")
  .update(themeInitScript)
  .digest("base64");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "object-src 'none'",
      `script-src 'self' 'sha256-${themeInitScriptHash}'`,
      "style-src 'self'",
      "connect-src 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
] as const;

const nextConfig: NextConfig = {
  async headers() {
    if (!isProductionEnvironment()) {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
};

export default nextConfig;
