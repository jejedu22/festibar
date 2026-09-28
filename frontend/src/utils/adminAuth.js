// frontend/src/utils/adminAuth.js
// Gestion du jeton de session de l'administrateur global
const TOKEN_KEY = 'adminToken'

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('isAdminAuthenticated') // ancien indicateur
}

// Vérifie la présence et l'expiration du jeton (la signature est vérifiée par le serveur)
export function isAdminAuthenticated() {
  const token = getAdminToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return !payload.exp || payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function adminHeaders(extra = {}) {
  const token = getAdminToken()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra }
}
