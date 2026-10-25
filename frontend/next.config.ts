import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

const config: NextConfig = {
  poweredByHeader: false,

  distDir: '.next',
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    '/api/*': ['../backend/migrations/*.sql'],
  },

  turbopack: {
    root: projectRoot,
  },
};

export default config;
