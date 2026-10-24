import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const apiOrigin = process.env.API_ORIGIN || 'http://127.0.0.1:5001';

const config: NextConfig = {
  poweredByHeader: false,

  // Standard Next.js build directory for Vercel
  distDir: '.next',

  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: apiOrigin.replace(/\/$/, '') + '/api/:path*',
      },
    ];
  },
};

export default config;
