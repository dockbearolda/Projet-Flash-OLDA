import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Devis Flash — OLDA',
        short_name: 'Devis Flash',
        description: 'Générateur de devis OLDA — atelier DTF Saint-Martin',
        theme_color: '#2f5a7a',
        background_color: '#ebeef0',
        display: 'standalone',
        orientation: 'landscape',
        lang: 'fr',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // Le flux temps réel ne doit jamais être intercepté ni mis en cache.
            urlPattern: /\/api\/catalog\/stream/,
            handler: 'NetworkOnly',
          },
          {
            // Catalogue : toujours le réseau d'abord pour que chaque appareil
            // reflète la dernière modif admin ; le cache ne sert que hors-ligne.
            urlPattern: /\/api\/catalog(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'df-catalog',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 4 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
