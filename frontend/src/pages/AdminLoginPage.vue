<!-- frontend/src/pages/AdminLoginPage.vue -->
<template>
  <div class="max-w-sm mx-auto p-4 min-h-screen flex flex-col">
    <form class="flex-1 flex flex-col justify-center space-y-3" @submit.prevent="login">
      <h1 class="text-2xl font-bold">Connexion administrateur</h1>
      <label class="block">
        <span class="text-sm font-medium">Mot de passe</span>
        <input v-model="password" type="password" autocomplete="current-password" class="w-full p-3 border rounded-lg mt-1" required autofocus />
      </label>
      <button class="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold disabled:opacity-50" :disabled="loading">
        {{ loading ? 'Connexion…' : 'Se connecter' }}
      </button>
      <p v-if="error" class="text-red-700" role="alert">{{ error }}</p>
    </form>
    <LegalFooter />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api'
import { setAdminToken } from '@/utils/adminAuth'
import LegalFooter from '@/components/LegalFooter.vue'

const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()

async function login() {
  error.value = ''
  loading.value = true
  try {
    const { token } = await api('/api/admin/auth/login', { method: 'POST', body: { password: password.value } })
    setAdminToken(token)
    password.value = ''
    router.push('/admin/organizations')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
