<template>
  <div class="max-w-sm mx-auto p-4">
    <h1 class="text-xl font-bold mb-4">Connexion {{ orgStore.organizationName }}</h1>
    <form @submit.prevent="login" class="space-y-2">
      <!-- Le slug est dans l'URL, pas besoin de le saisir -->
      <input
        v-model="password"
        placeholder="Mot de passe"
        type="password"
        class="w-full p-2 border rounded"
        required
      />
      <button class="w-full bg-blue-500 text-white p-2 rounded">Connexion</button>
    </form>
    <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'

const router = useRouter()
const route = useRoute()
const orgSlug = route.params.orgSlug
const orgStore = useOrganizationStore()

const password = ref('')
const error = ref('')

async function login() {
  error.value = ''

  try {
    const res = await fetch(`/api/${orgSlug}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    })

    if (!res.ok) {
      const data = await res.json()
      error.value = data.error || 'Erreur de connexion'
      return
    }

    const data = await res.json()

    // Met à jour le store et localStorage
    orgStore.login({ id: data.id, name: data.name, slug: orgSlug })

    // Redirection vers la page admin
    router.push(`/${orgSlug}/admin`)
  } catch (err) {
    error.value = 'Erreur réseau'
  }
}
</script>
