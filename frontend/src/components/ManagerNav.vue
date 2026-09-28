<!-- frontend/src/components/ManagerNav.vue -->
<template>
  <header class="mb-4">
    <div class="flex items-center justify-between gap-2">
      <p class="text-gray-700 truncate">{{ org.organizationName }} · gestion</p>
      <button class="text-sm text-red-700 underline shrink-0" @click="logout">Déconnexion</button>
    </div>
    <nav class="flex flex-wrap gap-2 mt-2" aria-label="Gestion">
      <router-link
        v-for="l in links"
        :key="l.to"
        :to="`/${slug}${l.to}`"
        class="px-3 py-1 rounded-full text-sm border"
        :class="route.path === `/${slug}${l.to}` ? 'bg-gray-800 text-white border-gray-800' : 'bg-white'"
      >{{ l.label }}</router-link>
    </nav>
  </header>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'

const route = useRoute()
const router = useRouter()
const org = useOrganizationStore()
const slug = route.params.orgSlug

const links = [
  { to: '/', label: '🛒 Prise de commande' },
  { to: '/admin', label: '🍺 Produits' },
  { to: '/categories', label: '📂 Catégories' },
  { to: '/admin/orders', label: '📦 Commandes' },
  { to: '/summary/daily', label: '💰 Ventes' },
]

function logout() {
  org.logout()
  router.push(`/${slug}/login`)
}
</script>
