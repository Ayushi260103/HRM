import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

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
  poweredByHeader: false,
  compress: true,
};

export default withPWA({
  dest: "public",
  disable: !isProd,        // 👈 PWA only in production
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
})(nextConfig);
