import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOrganizationStore = defineStore('organization', () => {
  // --- État principal ---
  const organization = ref(null)
  const organizationName = ref('')
  const isAuthenticated = ref(false) // nouvel état pour savoir si l'utilisateur est connecté

  // --- Chargement de l'organisation depuis le backend ---
  async function loadOrganization(orgSlug) {
    // évite de recharger si déjà présent
    if (organization.value && organization.value.slug === orgSlug) return

    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    const headers = auth.id ? { 'x-auth': JSON.stringify(auth) } : {}

    const res = await fetch(`/api/admin/organizations/${orgSlug}`, { headers })
    if (!res.ok) {
      // organisation introuvable ou pas autorisé
      organization.value = null
      organizationName.value = ''
      isAuthenticated.value = false
      return
    }

    const data = await res.json()
    organization.value = data
    organizationName.value = data?.name || ''
    isAuthenticated.value = !!auth.id // true si un auth existe
  }

  // --- Login : stocke l'authentification ---
  function login({ id, name, slug }) {
    localStorage.setItem('auth', JSON.stringify({ id, name, slug }))
    isAuthenticated.value = true
    organization.value = { id, name, slug }
    organizationName.value = name
  }

  // --- Logout ---
  function logout() {
    localStorage.removeItem('auth')
    isAuthenticated.value = false
    organization.value = null
    organizationName.value = ''
  }

  function getAuthHeaders() {
    if (!organization.value) return {}
    return {
      'Content-Type': 'application/json',
      'x-auth': JSON.stringify({
        id: organization.value.id,
        slug: organization.value.slug
      })
    }
  }

  return {
    organization,
    organizationName,
    isAuthenticated,
    loadOrganization,
    login,
    logout,
    getAuthHeaders
  }
})
