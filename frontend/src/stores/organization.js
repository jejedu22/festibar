// frontend/src/stores/organization.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/utils/api'
import { readJSON, writeJSON, remove, isTokenValid } from '@/utils/storage'

const SESSION_KEY = 'orgSession'

export const useOrganizationStore = defineStore('organization', () => {
  // Session : { token, role: 'staff' | 'manager', id, name, slug }
  const session = ref(readJSON(SESSION_KEY, null))
  remove('auth') // ancien format (en-tête x-auth), plus utilisé

  const organizationName = ref(session.value?.name || '')
  const organizationSlug = ref(session.value?.slug || '')

  const token = computed(() => session.value?.token || null)
  const role = computed(() => session.value?.role || null)
  const isManager = computed(() => role.value === 'manager')

  // Connecté (jeton non expiré) à l'organisation donnée, avec un rôle suffisant
  function isAuthenticatedFor(slug, requiredRole = 'staff') {
    const s = session.value
    if (!s || s.slug !== slug || !isTokenValid(s.token)) return false
    return requiredRole === 'staff' || s.role === 'manager'
  }

  // Nom public de l'organisation (null si elle n'existe pas)
  async function loadOrganization(slug) {
    if (organizationSlug.value === slug && organizationName.value) return true
    try {
      const data = await api(`/api/organizations/${slug}`)
      organizationName.value = data.name
      organizationSlug.value = slug
      return true
    } catch (err) {
      if (err.status === 404) return false
      throw err
    }
  }

  function login(data) {
    session.value = { token: data.token, role: data.role, id: data.id, name: data.name, slug: data.slug }
    organizationName.value = data.name
    organizationSlug.value = data.slug
    writeJSON(SESSION_KEY, session.value)
  }

  function logout() {
    session.value = null
    remove(SESSION_KEY)
  }

  // Requête authentifiée vers l'API de l'organisation courante
  function orgApi(path, options = {}) {
    return api(`/api/${organizationSlug.value}${path}`, { ...options, token: token.value })
  }

  return {
    session, token, role, isManager,
    organizationName, organizationSlug,
    isAuthenticatedFor, loadOrganization, login, logout, orgApi,
  }
})
