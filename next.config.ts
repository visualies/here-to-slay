import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
