import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: { port: 3000 },
    build: { outDir: 'build' },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [
          {
            name: 'load-js-files-as-jsx',
            setup(build) {
              build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => {
                const contents = await fs.readFile(args.path, 'utf8');
                return { loader: 'jsx', contents };
              });
            },
          },
        ],
      },
    },
    // ===== PRODUCTION FIX: process is not defined =====
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        REACT_APP_API_BASE_URL: JSON.stringify(env.REACT_APP_API_BASE_URL || env.VITE_API_BASE_URL || 'https://api.quickks.in/quickks/api/v1'),
        REACT_APP_API_URL: JSON.stringify(env.REACT_APP_API_URL || env.VITE_API_URL || 'https://api.quickks.in/quickks/api/v1'),
        REACT_APP_WS_URL: JSON.stringify(env.REACT_APP_WS_URL || env.VITE_WS_URL || 'wss://api.quickks.in/quickks/ws'),
        REACT_APP_VERSION: JSON.stringify(env.REACT_APP_VERSION || env.VITE_VERSION || '1.0.0'),
        REACT_APP_ENABLE_DEBUG_LOGS: JSON.stringify(env.REACT_APP_ENABLE_DEBUG_LOGS || 'false'),
        REACT_APP_GIT_SHA: JSON.stringify(env.REACT_APP_GIT_SHA || 'unknown'),
      },
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  };
});