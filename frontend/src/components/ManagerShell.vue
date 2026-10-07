<!-- frontend/src/components/ManagerShell.vue -->
<!-- Cadre des écrans gestionnaire : barre latérale (ordinateur) ou en-tête + onglets en bas (téléphone) -->
<template>
  <div class="min-h-screen bg-ground text-ink lg:flex">
    <!-- Barre latérale -->
    <nav class="hidden lg:flex flex-col gap-1.5 w-[264px] shrink-0 bg-white border-r border-slate-200 px-4 py-5 sticky top-0 h-screen" aria-label="Gestion">
      <div class="flex items-center gap-2.5 px-2 pb-4">
        <span class="w-9 h-9 rounded-[10px] bg-blue-600 text-white inline-flex items-center justify-center shrink-0"><Icon name="mug" /></span>
        <div class="min-w-0">
          <p class="font-display font-bold text-[17px] leading-tight break-words">{{ org.organizationName }}</p>
          <p class="text-xs text-slate-600">Espace gestionnaire</p>
        </div>
      </div>
      <router-link :to="`/${slug}/`" class="btn-primary min-h-[48px] rounded-xl mb-2.5">
        <Icon name="cart" />Prise de commande
      </router-link>
      <router-link
        v-for="l in sections"
        :key="l.to"
        :to="`/${slug}${l.to}`"
        class="min-h-[44px] flex items-center gap-3 px-3 rounded-[10px] font-medium"
        :class="isActive(l) ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'"
        :aria-current="isActive(l) ? 'page' : undefined"
      >
        <Icon :name="l.icon" />{{ l.label }}
      </router-link>
      <div class="flex-1"></div>
      <router-link
        :to="`/${slug}/fin-evenement`"
        class="min-h-[44px] flex items-center gap-3 px-3 rounded-[10px] font-medium text-red-900 hover:bg-red-50"
        :class="{ 'bg-red-50 font-semibold': route.path === `/${slug}/fin-evenement` }"
        :aria-current="route.path === `/${slug}/fin-evenement` ? 'page' : undefined"
      >
        <Icon name="warning" />Fin d’événement
      </router-link>
      <button type="button" class="min-h-[44px] flex items-center gap-3 px-3 rounded-[10px] font-medium text-slate-600 hover:bg-slate-50 text-left" @click="logout">
        <Icon name="logout" />Déconnexion
      </button>
    </nav>

    <div class="flex-1 min-w-0">
      <!-- En-tête téléphone / tablette -->
      <header class="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 min-h-[60px] flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="font-display font-bold text-[17px] truncate">{{ org.organizationName }}</p>
          <p class="text-xs text-slate-600">Espace gestionnaire</p>
        </div>
        <button type="button" class="icon-btn" aria-label="Plus d’options" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
          <Icon :name="menuOpen ? 'close' : 'menu'" />
        </button>
        <div v-if="menuOpen" class="absolute right-3 top-[58px] w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-30">
          <router-link :to="`/${slug}/fin-evenement`" class="min-h-[44px] flex items-center gap-3 px-3 rounded-lg text-red-900 hover:bg-red-50" @click="menuOpen = false">
            <Icon name="warning" />Fin d’événement
          </router-link>
          <button type="button" class="w-full min-h-[44px] flex items-center gap-3 px-3 rounded-lg text-slate-700 hover:bg-slate-50 text-left" @click="logout">
            <Icon name="logout" />Déconnexion
          </button>
        </div>
      </header>

      <main class="max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8 pb-28 lg:pb-12">
        <slot />
      </main>
    </div>

    <!-- Onglets téléphone / tablette -->
    <nav class="lg:hidden fixed inset-x-0 bottom-0 z-20 bg-white border-t border-slate-200 grid grid-cols-4 px-1 pt-1.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]" aria-label="Gestion">
      <router-link
        v-for="l in tabs"
        :key="l.to"
        :to="`/${slug}${l.to}`"
        class="min-h-[52px] flex flex-col items-center justify-center gap-0.5 text-xs"
        :class="isActive(l) ? 'text-blue-800 font-bold' : 'text-slate-600 font-medium'"
        :aria-current="isActive(l) ? 'page' : undefined"
      >
        <Icon :name="l.icon" :size="22" :stroke="isActive(l) ? 2.2 : 2" />{{ l.short || l.label }}
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import Icon from './Icon.vue'

const route = useRoute()
const router = useRouter()
const org = useOrganizationStore()
const slug = route.params.orgSlug
const menuOpen = ref(false)

// match : autres chemins rattachés à la même section (Catégories fait partie de la Carte)
const sections = [
  { to: '/admin', label: 'Carte', icon: 'menu', match: ['/categories'] },
  { to: '/admin/orders', label: 'Commandes', icon: 'clipboard' },
  { to: '/summary/daily', label: 'Ventes', icon: 'chart' },
]
const tabs = [{ to: '/', label: 'Prise de commande', short: 'Commande', icon: 'cart' }, ...sections]

function isActive(l) {
  const path = route.path.replace(/\/$/, '') || '/'
  const base = `/${slug}`
  return [l.to, ...(l.match || [])].some(p => path === (p === '/' ? base : base + p))
}

function logout() {
  menuOpen.value = false
  org.logout()
  router.push(`/${slug}/login`)
}
</script>
