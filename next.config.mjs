/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['v0.dev'],
    unoptimized: true,
  },
  webpack: (config, { isServer, dev }) => {
    // Only apply this in production build or when building for client
    if (!isServer || !dev) {
      // Mock next/headers for client and Pages Router
      config.resolve.alias['next/headers'] = require.resolve('./mocks/next-headers.ts');
    }
    
    return config;
  },
};

export default nextConfig;
