import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Automatische Updates im Hintergrund
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Precache alle statischen Assets für Offline-First
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,woff}'],
        // Erhöhe das Limit für große Font-Dateien
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
        // Erweiterte Cache-Strategien
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        // Offline-first Strategy für statische Assets
        runtimeCaching: [
          // HTML - Cache First (echtes Offline-First)
          {
            urlPattern: /\.html$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          // JS, CSS - Stale While Revalidate (schnell laden, im Hintergrund updaten)
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Images - Cache First (offline first)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Fonts - Cache First (offline first)
          {
            urlPattern: /\.(?:woff2|woff|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // FontAwesome Assets - Cache First
          {
            urlPattern: /\/fontawesome\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fontawesome-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // Google Fonts - Cache First
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }//,
          // // API Calls - Network First mit Fallback
          // {
          //   urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          //   handler: 'NetworkFirst',
          //   options: {
          //     cacheName: 'api-cache',
          //     expiration: {
          //       maxEntries: 50,
          //       maxAgeSeconds: 60 * 5 // 5 minutes
          //     },
          //     networkTimeoutSeconds: 3
          //   }
          // }
        ]
      },
      // Erweiterte PWA Konfiguration
      devOptions: {
        enabled: true,
        type: 'module'
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ZUTATO - Einkaufsliste',
        short_name: 'ZUTATO',
        description: 'Deine intelligente Einkaufsliste für den Haushalt',
        theme_color: '#fbbf24',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ],
        shortcuts: [
          {
            name: 'Neue Einkaufsliste',
            short_name: 'Neue Liste',
            description: 'Erstelle eine neue Einkaufsliste',
            url: '/shopping-list',
            icons: [
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'Suche',
            short_name: 'Suche',
            description: 'Suche nach Produkten',
            url: '/shopping-list/search',
            icons: [
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          }
        ]
      }
    })
  ],
})

