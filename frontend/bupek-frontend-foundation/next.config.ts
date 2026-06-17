import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'api.bupekfinance.co.tz', pathname: '/uploads/**' },
    ],
  },
  async rewrites() {
    return [];
  },
};

export default nextConfig;