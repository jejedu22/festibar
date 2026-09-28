import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './utils/api'
import { useOrganizationStore } from './stores/organization'
import { useUiStore } from './stores/ui'
import { clearAdminToken } from './utils/adminAuth'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Jeton refusé par le serveur (expiré, mot de passe changé…) : retour à la connexion
setUnauthorizedHandler(message => {
  const route = router.currentRoute.value
  useUiStore().error(message || 'Session expirée, reconnectez-vous.')
  if (route.path.startsWith('/admin')) {
    clearAdminToken()
    router.push('/admin/auth/login')
  } else if (route.params.orgSlug) {
    useOrganizationStore().logout()
    router.push({ path: `/${route.params.orgSlug}/login`, query: { redirect: route.fullPath } })
  }
})

app.mount('#app')

// Application installable + chargement hors-ligne (HTTPS ou localhost uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
