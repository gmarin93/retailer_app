import type { NextConfig } from "next";

/**
 * Baseline security headers for every route. A full Content-Security-Policy
 * is deferred until the nonce plumbing lands in `src/proxy.ts` (see
 * MIGRATION_PLAN.md, "Auth hardening") — these are the headers that are safe
 * to enforce globally today.
 */
const securityHeaders = [
  // Browsers must not MIME-sniff responses away from the declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The app is not designed to be embedded; block clickjacking via framing.
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin cross-origin; full URL for same-origin navigation.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses none of these sensors/devices.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Barrel-file package: import only the icons each route touches
    // (recharts et al. are already on Next's default-optimized list).
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
