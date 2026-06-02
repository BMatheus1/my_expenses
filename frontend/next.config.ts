import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
];

const serviceWorkerHeaders = [
  {
    key: "Content-Type",
    value: "application/javascript; charset=utf-8",
  },
  {
    key: "Cache-Control",
    value: "no-cache, no-store, must-revalidate",
  },
];

const capacitorConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  env: {
    NEXT_PUBLIC_CAPACITOR_BUILD: "true",
  },
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

const webConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  env: {
    NEXT_PUBLIC_CAPACITOR_BUILD: "false",
  },

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: serviceWorkerHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const nextConfig = isCapacitorBuild ? capacitorConfig : webConfig;

export default nextConfig;
