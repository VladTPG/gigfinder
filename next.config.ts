import { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
          process.env.MINIO_USE_SSL === "true" ? "https" : "http",
        hostname: process.env.MINIO_ENDPOINT || "",
        port: process.env.MINIO_PORT,
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vlad.mvp.tfm.ro",
        pathname: "/gigfinder/**",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
