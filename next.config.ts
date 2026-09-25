import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/library-images": ["./public/images/**/*"],
  },
};

export default nextConfig;
