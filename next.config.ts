import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol:
          process.env.NEXT_PUBLIC_MINIO_USE_SSL === "true" ? "https" : "http",
        hostname: process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "",
        port: process.env.NEXT_PUBLIC_MINIO_PORT,
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
