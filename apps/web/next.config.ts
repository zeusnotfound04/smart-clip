import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from your domain
  allowedDevOrigins: [
    'smartclips.upalert.online',
    'https://smartclips.upalert.online'
  ],
  
  // Turbopack configuration
  turbopack: {
    root: '../../', // Set to monorepo root
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
