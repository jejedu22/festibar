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
    allowedHosts: ['all', 'localhost', 'v011085.cotesdarmor.dpt', '10.2.11.85'],          // ← évite le blocage par nom de domaine ou IP
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
