<!-- frontend/src/components/CarteTabs.vue -->
<template>
  <nav class="inline-flex p-1 bg-slate-200 rounded-xl" aria-label="Section de la carte">
    <router-link
      v-for="t in tabs"
      :key="t.to"
      :to="`/${slug}${t.to}`"
      class="min-h-[40px] px-5 inline-flex items-center rounded-[9px] text-[15px]"
      :class="route.path === `/${slug}${t.to}` ? 'bg-white text-ink font-semibold shadow-sm' : 'text-slate-700 font-medium'"
      :aria-current="route.path === `/${slug}${t.to}` ? 'page' : undefined"
    >{{ t.label }}</router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const slug = route.params.orgSlug
const tabs = [
  { to: '/admin', label: 'Produits' },
  { to: '/categories', label: 'Catégories' },
]
</script>
