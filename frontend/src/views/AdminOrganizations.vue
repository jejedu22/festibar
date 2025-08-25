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
        @input="onSlugInput"
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

      <p v-if="organizations.length === 0" class="text-gray-400 italic text-center mt-4">
        Aucune organisation enregistrée.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const organizations = ref([])
const loading = ref(true)
const error = ref(null)

const nameInput = ref(null)
const slugManuallyEdited = ref(false) // pour savoir si l'utilisateur a modifié le slug

const form = reactive({
  id: null,
  name: '',
  slug: '',
  password: '',
})

// --- Fonction utilitaire pour générer un slug ---
function generateSlug(str) {
  return str
    .normalize('NFD')                  // décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '')  // supprime les accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')             // remplace les espaces par des tirets
    .replace(/[^\w-]/g, '')           // supprime les caractères spéciaux
}

// --- Surveille les changements du nom ---
watch(() => form.name, (newName) => {
  if (!slugManuallyEdited.value) {
    form.slug = generateSlug(newName)
  }
})

// --- Détecte si l'utilisateur modifie manuellement le slug ---
function onSlugInput() {
  slugManuallyEdited.value = true
}

// --- Réinitialise le formulaire ---
function reset() {
  Object.assign(form, { id: null, name: '', slug: '', password: '' })
  slugManuallyEdited.value = false
}

// --- Remplir le formulaire pour édition ---
function edit(o) {
  Object.assign(form, {
    id: o.id,
    name: o.name,
    slug: o.slug,
    password: '', // on ne récupère pas le mot de passe
  })
  slugManuallyEdited.value = true
  nextTick(() => {
    nameInput.value?.focus()
  })
}

// --- Supprimer organisation ---
async function del(id) {
  await fetch(`/api/admin/organizations/${id}`, { method: 'DELETE' })
  await loadOrganizations()
}

// --- Ajouter / modifier organisation ---
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

// --- Charger organisations ---
async function loadOrganizations() {
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

// --- Navigation vers l'organisation ---
function goToOrg(org) {
  router.push(`/${org.slug}/admin`)
}

// --- Déconnexion ---
function logout() {
  localStorage.removeItem('auth')
  localStorage.removeItem('isAdminAuthenticated')
  router.push({ path: '/' })
}

onMounted(loadOrganizations)
</script>
