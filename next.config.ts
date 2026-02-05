import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
  reactStrictMode: true,
  // Optimize production builds
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
