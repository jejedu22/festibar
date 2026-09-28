<!-- frontend/src/pages/LoginPage.vue -->
<template>
  <div class="max-w-sm mx-auto p-4 min-h-screen flex flex-col">
    <div class="flex-1 flex flex-col justify-center">
      <h1 class="text-2xl font-bold mb-1">{{ org.organizationName }}</h1>
      <p class="text-gray-700 mb-4">Connexion serveur ou gestionnaire</p>
      <form class="space-y-3" @submit.prevent="login">
        <label class="block">
          <span class="text-sm font-medium">Mot de passe</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full p-3 border rounded-lg mt-1"
            required
            autofocus
          />
        </label>
        <button class="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold disabled:opacity-50" :disabled="loading">
          {{ loading ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
      <p v-if="error" class="text-red-700 mt-3" role="alert">{{ error }}</p>
    </div>
    <LegalFooter />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { api } from '@/utils/api'
import LegalFooter from '@/components/LegalFooter.vue'

const router = useRouter()
const route = useRoute()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()

const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  try {
    const data = await api(`/api/${orgSlug}/login`, { method: 'POST', body: { password: password.value } })
    org.login(data)
    password.value = ''

    // Retour à la page demandée si le rôle le permet, sinon page par défaut du rôle
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith(`/${orgSlug}`) ? route.query.redirect : null
    const target = redirect && router.resolve(redirect)
    if (target && (target.meta.role !== 'manager' || data.role === 'manager')) router.push(redirect)
    else router.push(`/${orgSlug}/`)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
