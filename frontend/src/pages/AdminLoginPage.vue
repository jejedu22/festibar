<!-- frontend/src/pages/AdminLoginPage.vue -->
<template>
  <div class="max-w-sm mx-auto p-4 min-h-screen flex flex-col">
    <form class="flex-1 flex flex-col justify-center space-y-3" @submit.prevent="login">
      <h1 class="text-2xl font-bold">Connexion administrateur</h1>
      <label class="block">
        <span class="text-sm font-medium">Mot de passe</span>
        <input v-model="password" type="password" autocomplete="current-password" class="w-full p-3 border rounded-lg mt-1" required autofocus />
      </label>
      <label v-if="totp" class="block">
        <span class="text-sm font-medium">Code de l’application d’authentification</span>
        <input v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" class="w-full p-3 border rounded-lg mt-1 tracking-widest" required />
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api'
import { setAdminToken } from '@/utils/adminAuth'
import LegalFooter from '@/components/LegalFooter.vue'

const password = ref('')
const code = ref('')
const totp = ref(false)
const error = ref('')
const loading = ref(false)
const router = useRouter()

// Double authentification activée sur le serveur ? (le champ de code n'apparaît alors)
onMounted(async () => {
  try {
    totp.value = (await api('/api/admin/auth/options')).totp
  } catch {
    /* champ de code affiché à l'échec de la connexion si besoin */
  }
})

async function login() {
  error.value = ''
  loading.value = true
  try {
    const { token } = await api('/api/admin/auth/login', { method: 'POST', body: { password: password.value, ...(totp.value ? { code: code.value } : {}) } })
    setAdminToken(token)
    password.value = ''
    code.value = ''
    router.push('/admin/organizations')
  } catch (err) {
    error.value = err.message
    code.value = ''
    // Serveur avec double authentification dont les options n'avaient pas pu être lues
    if (err.status === 400 && /code/i.test(err.message)) totp.value = true
  } finally {
    loading.value = false
  }
}
</script>
