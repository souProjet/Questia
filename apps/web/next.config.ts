import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@questia/shared', '@questia/ui', 'solito', 'react-native', 'react-native-web'],
  serverExternalPackages: ['@prisma/client', 'prisma'],
  /** Ancienne route partage : tout passe par la modal sur /app */
  async redirects() {
    return [{ source: '/app/share', destination: '/app', permanent: false }];
  },
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
