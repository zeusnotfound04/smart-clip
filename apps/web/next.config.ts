import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from your domain
  allowedDevOrigins: [
    'smartclips.gunman.social',
    'https://smartclips.gunman.social',
    'smartclips.upalert.online',
    'smartclips.nano-mail.me',
    'https://smartclips.upalert.online',
    'https://smartclips.nano-mail.me'
  ],
  
  // Turbopack configuration
  turbopack: {
    root: path.resolve(__dirname, '../../'), // Set to monorepo root with absolute path
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
