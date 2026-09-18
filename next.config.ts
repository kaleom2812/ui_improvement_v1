import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: false, // Nginx handles gzip

  // Security — don't leak framework info
  poweredByHeader: false,

  // Serve GEO Tool under /geo path on the university AI portal
  // Uncomment these two lines when running on the University Server
  // basePath: '/geo',
  // assetPrefix: '/geo',

  // Production optimizations
  productionBrowserSourceMaps: false,
};

export default nextConfig;
