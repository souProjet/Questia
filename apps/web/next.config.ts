import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dopamode/shared', '@dopamode/ui', 'solito', 'react-native', 'react-native-web'],
  serverExternalPackages: ['@prisma/client', 'prisma'],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
      canvas: false,
    };
    config.resolve.extensions = [
      '.web.js', '.web.ts', '.web.tsx',
      ...(config.resolve.extensions ?? []),
    ];
    return config;
  },
};

export default nextConfig;
