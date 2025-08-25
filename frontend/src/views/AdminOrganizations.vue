<!-- frontend/src/views/AdminOrganizations.vue -->
<template>
  <div class="relative max-w-md mx-auto p-4">
    <!-- Bouton de déconnexion -->
    <button
      @click="logout"
      class="absolute top-4 right-4 text-sm text-red-600 hover:underline"
    >
      🔓 Déconnexion
    </button>

    <!-- Titres -->
    <h1 class="text-xl font-bold mb-2">🛠️ Admin - Organisations</h1>
    <p class="text-gray-500 mb-4">Gère ici la liste de tes organisations</p>

    <!-- Formulaire -->
    <form @submit.prevent="save" class="mt-2 space-y-2">
      <input
        v-model="form.name"
        ref="nameInput"
        placeholder="Nom de l'organisation"
        class="w-full p-2 border rounded"
        required
      />
      <input
        v-model="form.slug"
        placeholder="Slug (identifiant unique)"
        class="w-full p-2 border rounded"
        required
      />
      <input
        v-model="form.password"
        type="password"
        placeholder="Mot de passe"
        class="w-full p-2 border rounded"
        :required="!form.id"
      />

      <button class="w-full bg-green-500 text-white p-2 rounded">
        {{ form.id ? '💾 Enregistrer' : '➕ Ajouter' }}
      </button>
      <button
        v-if="form.id"
        @click="reset"
        type="button"
        class="w-full bg-gray-400 text-white p-2 rounded"
      >
        ✖️ Annuler
      </button>
    </form>

    <!-- Zone de chargement / erreurs -->
    <div v-if="loading" class="mt-6 text-gray-500">Chargement...</div>
    <div v-else-if="error" class="mt-6 text-red-500">
      {{ error }}
    </div>

    <!-- Liste -->
    <div v-else class="mt-6">
      <div
        v-for="org in organizations"
        :key="org.id"
        class="flex justify-between items-center border p-2 mb-2 rounded"
      >
        <div>
          <strong>{{ org.name }}</strong>
          <span class="text-sm text-gray-500 ml-2">({{ org.slug }})</span>
        </div>
        <div class="space-x-2">
          <button @click="edit(org)" class="bg-yellow-300 px-2 rounded">🖊️</button>
          <button @click="del(org.id)" class="bg-red-300 px-2 rounded">🗑️</button>
          <button @click="goToOrg(org)" class="bg-blue-300 px-2 rounded">➡️</button>
        </div>
      </div>

      <!-- Message vide -->
      <p v-if="organizations.length === 0" class="text-gray-400 italic text-center mt-4">
        Aucune organisation enregistrée.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const organizations = ref([])
const loading = ref(true)
const error = ref(null)

const nameInput = ref(null)
const form = reactive({
  id: null,
  name: '',
  slug: '',
  password: '',
})

function reset() {
  Object.assign(form, { id: null, name: '', slug: '', password: '' })
}

function edit(o) {
  Object.assign(form, {
    id: o.id,
    name: o.name,
    slug: o.slug,
    password: '', // on ne récupère pas le mot de passe
  })
  nextTick(() => {
    nameInput.value?.focus()
  })
}

async function del(id) {
  await fetch(`/api/admin/organizations/${id}`, { method: 'DELETE' })
  await loadOrganizations()
}

async function save() {
  const method = form.id ? 'PUT' : 'POST'
  const url = form.id
    ? `/api/admin/organizations/${form.id}`
    : `/api/admin/organizations`

  const payload = { ...form }
  if (form.id && !form.password) {
    delete payload.password // ne pas envoyer de password vide lors de l'édition
  }

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  reset()
  await loadOrganizations()
}

async function loadOrganizations() {
  const res = await fetch(`/api/admin/organizations`, {
    headers: {
      'x-admin-password': import.meta.env.VITE_ADMIN_PASSWORD
    }
  })
  try {
    loading.value = true
    const res = await fetch('/api/admin/organizations')
    if (!res.ok) throw new Error('Impossible de charger les organisations.')
    organizations.value = await res.json()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function goToOrg(org) {
  router.push(`/${org.slug}/admin`)
}

function logout() {
  localStorage.removeItem('auth')
  localStorage.removeItem('isAdminAuthenticated')
  router.push({ path: '/' })
}


onMounted(loadOrganizations)
</script>
