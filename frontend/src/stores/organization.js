import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOrganizationStore = defineStore('organization', () => {
  const organization = ref(null)
  const organizationName = ref('')

  async function loadOrganization(orgSlug) {
    // évite de recharger si déjà présent
    if (organization.value && organization.value.slug === orgSlug) return

    const res = await fetch(`/api/admin/organizations/${orgSlug}`)
    const data = await res.json()
    organization.value = data
    organizationName.value = data?.name || ''
  }

  return { organization, organizationName, loadOrganization }
})
