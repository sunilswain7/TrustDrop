import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp', 'pg', 'ws'],
  turbopack: {},
};

export default nextConfig;
