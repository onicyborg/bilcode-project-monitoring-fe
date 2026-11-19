import type { NextConfig } from "next";

if (process.env.VERCEL && !process.env.API_URL) {
  throw new Error("Set API_URL in Vercel to the public HTTPS backend origin.");
}

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  output: process.env.VERCEL ? undefined : "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL || "http://127.0.0.1:4100"}/api/:path*`,
      },
    ];
  },
};
export default config;
