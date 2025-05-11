import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ESM compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    domains: ['v0.blob.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
    minimumCacheTTL: 60, // Cache for 1 minute only
  },
  webpack: (config, { isServer, dev }) => {
    // Only apply this in production build or when building for client
    if (!isServer || !dev) {
      // Mock next/headers for client and Pages Router
      config.resolve.alias['next/headers'] = path.join(__dirname, 'mocks', 'next-headers.ts');
    }
    
    return config;
  },
};

export default nextConfig;
