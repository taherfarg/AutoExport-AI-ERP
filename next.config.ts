import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/supabase-proxy/:path*",
        destination: "http://127.0.0.1:55421/:path*",
      },
    ];
  },
};

export default nextConfig;
