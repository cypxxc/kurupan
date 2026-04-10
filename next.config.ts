import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
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
    if (process.env.APP_ENV !== "production") {
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
