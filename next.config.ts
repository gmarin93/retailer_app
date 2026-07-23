import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export only for production builds (S3/CloudFront). `next dev` keeps
  // full server features — middleware/proxy, image optimization — so the
  // planned cookie-auth work in `src/proxy.ts` stays testable locally.
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  poweredByHeader: false,
  images: {
    // Static export has no server to run the default image optimizer.
    // Images are served as-is from S3/CloudFront.
    unoptimized: true,
  },
  experimental: {
    // Barrel-file package: import only the icons each route touches
    // (recharts et al. are already on Next's default-optimized list).
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
};

export default nextConfig;
