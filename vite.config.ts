import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy /api to local wrangler pages dev for full-stack testing.
      // Start API with: npx wrangler pages dev ./dist --local --port 8788
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8788',
          changeOrigin: true,
        },
      },
    },
  };
});
