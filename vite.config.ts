import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The panel is served by the backend at /admin (ADMIN_UI_DIR=dist); in development
// Vite proxies the API to the local backend so the browser sees one origin.
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/admin/api': { target: process.env.SCOREPILOT_API ?? 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900 },
})
