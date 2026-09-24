import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'Sistem Manajemen Kelas (SIMAK)',
          short_name: 'SIMAK',
          description: 'Aplikasi Manajemen Kelas Single Page Application dengan Firebase Realtime Database dan RBAC.',
          theme_color: '#1e3a8a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json,webmanifest}'],
          runtimeCaching: [
            {
              // Google Fonts Stylesheets
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Google Fonts Webfonts
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Static Images, Icons & Media Assets
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|avif)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-static-images',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 hari
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Cloud Storage, Google Drive Photo Thumbnails & External CDN Assets
              urlPattern: /^https:\/\/(?:images\.unsplash\.com|drive\.google\.com|lh3\.googleusercontent\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|firebasestorage\.googleapis\.com)\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cloud-media-cdn-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Firebase Firestore & Realtime Sync Offline Fallback
              urlPattern: /^https:\/\/(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com)\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-offline-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 hari
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
