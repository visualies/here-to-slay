import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy room/game server API requests to port 1234
      {
        source: '/api/rooms/:path*',
        destination: 'http://localhost:1234/api/:path*',
      },
      {
        source: '/api/game/:path*',
        destination: 'http://localhost:1234/api/:path*',
      },
      // Proxy dice server API requests to port 1235
      {
        source: '/api/dice/:path*',
        destination: 'http://localhost:1235/api/dice/:path*',
      },
    ];
  },
};

export default nextConfig;
