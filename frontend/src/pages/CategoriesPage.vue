<template>
  <div class="max-w-md mx-auto p-4">
    <h1 class="text-xl font-bold mb-4">{{ orgStore.organizationName }}</h1>
    <h2 class="text-xl font-bold mb-4">📂 Catégories</h2>
    
    <div v-for="category in categories" :key="category.id" class="flex justify-between items-center border p-2 mb-2 rounded">
      <div>{{ category.name }}</div>
      <div class="flex gap-2">
        <button @click="edit(category)" class="bg-blue-400 px-3 py-1 rounded text-white">✏️ Modifier</button>
        <button @click="del(category.id)" class="bg-red-400 px-3 py-1 rounded text-white">🗑️ Supprimer</button>
      </div>
    </div>
    
    <form @submit.prevent="save" class="mt-4 space-y-2">
      <input v-model="form.name" placeholder="Nom de la catégorie" class="w-full p-2 border rounded" required />
      <button class="w-full bg-green-500 text-white p-2 rounded">
        {{ form.id ? '💾 Mettre à jour' : '💾 Ajouter' }}
      </button>
      <button v-if="form.id" type="button" @click="cancelEdit" class="w-full bg-gray-400 text-white p-2 rounded">
        ✖ Annuler
      </button>
    </form>
    
    <router-link :to="`/${orgSlug}/admin`" class="block text-center mt-4 text-sm text-gray-500">⬅ Retour</router-link>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'

const route = useRoute()
const router = useRouter()
const orgSlug = route.params.orgSlug
const orgStore = useOrganizationStore()

if (!orgStore.isAuthenticated || orgStore.organization?.slug !== orgSlug) {
  router.push(`/${orgSlug}/login`)
}

const categories = ref([])
const form = reactive({ id: null, name: '' })

function getAuthHeaders() {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}')
  return {
    'Content-Type': 'application/json',
    'x-auth': JSON.stringify(auth)
  }
}

async function load() {
  const res = await fetch(`/api/${orgSlug}/categories`, {
    headers: getAuthHeaders()
  })
  categories.value = await res.json()
}

// Ajouter ou modifier
async function save() {
  let res
  if (form.id) {
    // Modifier
    res = await fetch(`/api/${orgSlug}/categories/${form.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: form.name })
    })
  } else {
    // Ajouter
    res = await fetch(`/api/${orgSlug}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: form.name })
    })
  }

  if (!res.ok) {
    const data = await res.json()
    alert(data.error || "Erreur lors de l'opération.")
  } else {
    form.id = null
    form.name = ''
    load()
  }
}

// Supprimer
async function del(id) {
  if (!confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return

  const res = await fetch(`/api/${orgSlug}/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!res.ok) {
    const data = await res.json()
    alert(data.error || "Erreur lors de la suppression.")
  } else {
    load()
  }
}

// Préparer le formulaire pour modifier
function edit(category) {
  form.id = category.id
  form.name = category.name
}

// Annuler la modification
function cancelEdit() {
  form.id = null
  form.name = ''
}

onMounted(load)
</script>
