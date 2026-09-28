<!-- frontend/src/layouts/OrganizationLayout.vue -->
<template>
  <NotFound v-if="state === 'missing'" />
  <div v-else-if="state === 'error'" class="p-6 text-center">
    <p class="mb-4">Impossible de joindre le serveur.</p>
    <button class="px-4 py-2 bg-blue-600 text-white rounded" @click="load">Réessayer</button>
  </div>
  <router-view v-else />
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NotFound from '../pages/NotFound.vue'
import { useOrganizationStore } from '@/stores/organization'

const route = useRoute()
const org = useOrganizationStore()
const state = ref('ok') // ok | missing | error

async function load() {
  try {
    state.value = (await org.loadOrganization(route.params.orgSlug)) ? 'ok' : 'missing'
  } catch {
    // Hors-ligne : on laisse la prise de commande fonctionner avec les données en cache
    state.value = org.organizationSlug === route.params.orgSlug ? 'ok' : 'error'
  }
}

watch(() => route.params.orgSlug, load, { immediate: true })
</script>
