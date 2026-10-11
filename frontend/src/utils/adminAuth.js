// frontend/src/utils/adminAuth.js
// Gestion du jeton de session de l'administrateur global.
// Conservé dans sessionStorage : il disparaît à la fermeture de l'onglet (localStorage le laisserait
// lisible par tout script de la page, indéfiniment).
import { isTokenValid, remove } from './storage'
import { api } from './api'

const TOKEN_KEY = 'adminToken'

export function getAdminToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
  remove(TOKEN_KEY) // ancien emplacement (localStorage) des versions précédentes
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
  remove(TOKEN_KEY)
  remove('isAdminAuthenticated') // ancien indicateur
}

// Déconnexion : la session est aussi révoquée côté serveur (échec réseau ignoré : le jeton expire de toute façon)
export async function logoutAdmin() {
  const token = getAdminToken()
  clearAdminToken()
  if (token) await api('/api/admin/auth/logout', { method: 'POST', token }).catch(() => {})
}

export function isAdminAuthenticated() {
  return isTokenValid(getAdminToken())
}
