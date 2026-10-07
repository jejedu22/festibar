// frontend/src/utils/installPrompt.js
// Invite d'installation de l'application (Chrome / Edge / Android) : l'événement est mémorisé
// pour être déclenché depuis un bouton.
import { ref } from 'vue'

export const canInstall = ref(false)
let deferred = null

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferred = e
  canInstall.value = true
})

window.addEventListener('appinstalled', () => {
  deferred = null
  canInstall.value = false
})

export async function install() {
  if (!deferred) return
  deferred.prompt()
  await deferred.userChoice.catch(() => {})
  deferred = null
  canInstall.value = false
}
