import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

// Injecte dans dist/sw.js la liste des fichiers à pré-charger et un identifiant de version :
// le navigateur télécharge ainsi toute l'application dès la première visite, et un nouveau
// build remplace proprement l'ancien cache.
function precacheServiceWorker() {
  let outDir = 'dist'
  return {
    name: 'festibar-precache-sw',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js')
      if (!fs.existsSync(swPath)) return
      const assetsDir = path.join(outDir, 'assets')
      const assets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).sort().map(f => `/assets/${f}`) : []
      const statics = ['/', '/index.html', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']
        .filter(u => u === '/' || fs.existsSync(path.join(outDir, u)))
      const list = [...statics, ...assets]
      const build = crypto.createHash('sha1').update(list.join('|')).digest('hex').slice(0, 10)
      const sw = fs.readFileSync(swPath, 'utf8')
        .replace(/const BUILD = '.*';/, `const BUILD = '${build}';`)
        .replace(/const PRECACHE = \[.*\];/, `const PRECACHE = ${JSON.stringify(list)};`)
      fs.writeFileSync(swPath, sw)
    },
  }
}

export default defineConfig({
  plugins: [vue(), precacheServiceWorker()],
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
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:3001'
    }
  }
})
