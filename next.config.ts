import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only modules from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
      };
      
      // Exclude better-sqlite3 from client bundle
      config.externals = config.externals || [];
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  async rewrites() {
    const gameServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_API_URL;
    const diceServerUrl = process.env.NEXT_PUBLIC_DICE_SERVER_API_URL;

    if (!gameServerUrl) {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_GAME_SERVER_API_URL');
    }
    if (!diceServerUrl) {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_DICE_SERVER_API_URL');
    }

    return [
      // Proxy room/game server API requests
      {
        source: '/api/rooms/:path*',
        destination: `${gameServerUrl}/:path*`,
      },
      {
        source: '/api/game/:path*',
        destination: `${gameServerUrl}/game/:path*`,
      },
      // Proxy dice server API requests
      {
        source: '/api/dice/:path*',
        destination: `${diceServerUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
