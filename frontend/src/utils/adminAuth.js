// frontend/src/utils/adminAuth.js
// Gestion du jeton de session de l'administrateur global
import { isTokenValid, remove } from './storage'

const TOKEN_KEY = 'adminToken'

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearAdminToken() {
  remove(TOKEN_KEY)
  remove('isAdminAuthenticated') // ancien indicateur
}

export function isAdminAuthenticated() {
  return isTokenValid(getAdminToken())
}
