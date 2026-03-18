import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@jobagg/shared'],
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
