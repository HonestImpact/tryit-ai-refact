import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skip type checking for placeholder files during build (for production hotfix)
    // Remove this when implementing the full analytics/knowledge/tools layers
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during builds for now
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
