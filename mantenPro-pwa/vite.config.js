import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // IMPORTANTE: Cambia 'mantenpro' por el nombre de tu repositorio en GitHub
  base: '/mantenpro/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'MantenPro - Gestión Industrial',
        short_name: 'MantenPro',
        description: 'Sistema de gestión de paradas de máquinas',
        theme_color: '#0B0F1A',
        background_color: '#0B0F1A',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/mantenpro/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/script\.google\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sheets-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          }
        ]
      }
    })
  ]
})
