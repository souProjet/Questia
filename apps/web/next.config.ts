import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@quetes/shared', '@quetes/ui', 'solito'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
