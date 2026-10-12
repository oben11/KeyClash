import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Keyclash',
        short_name: 'Keyclash',
        description: 'Race friends through the same quote. First to finish wins.',
        theme_color: '#1c1f2a',
        background_color: '#1c1f2a',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: { navigateFallbackDenylist: [/^\/ws/] },
    }),
  ],
  server: { proxy: { '/ws': { target: 'ws://localhost:3001', ws: true } } },
});
