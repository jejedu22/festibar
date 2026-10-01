import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',              // ← autorise les connexions extérieures
    port: 8001,
    strictPort: true,
    cors: true,
    // Noms d'hôte supplémentaires acceptés par le serveur de dev (séparés par des virgules)
    allowedHosts: ['localhost', ...(process.env.VITE_ALLOWED_HOSTS || '').split(',').filter(Boolean)],
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:3001'
    }
  }
})
