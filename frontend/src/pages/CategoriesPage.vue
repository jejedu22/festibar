<!-- frontend/src/pages/CategoriesPage.vue -->
<template>
  <div class="max-w-md mx-auto p-4">
    <h1 class="text-xl font-bold mb-4">{{ orgStore.organizationName }}</h1>
    <h2 class="text-xl font-bold mb-4">📂 Catégories</h2>

    <!-- Liste draggable avec dnd-kit -->
    <div>
      <div
        v-for="(category, index) in categories"
        :key="category.id"
        class="flex justify-between items-center border p-2 mb-2 rounded cursor-move"
        :style="{ backgroundColor: draggingId === category.id ? '#e2e8f0' : '' }"
        @mousedown="startDrag(category.id)"
      >
        <span
          class="cursor-grab mr-2 select-none"
          title="Déplacer"
          @mousedown="startDrag(category.id, $event)"
        >
          ☰
        </span>
        <div>{{ category.name }}</div>
        <div class="flex gap-2">
          <button @click="edit(category)" class="bg-blue-400 px-3 py-1 rounded text-white">✏️ Modifier</button>
          <button @click="del(category.id)" class="bg-red-400 px-3 py-1 rounded text-white">🗑️ Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Formulaire ajout / modification -->
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
const draggingId = ref(null)

function getAuthHeaders() {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}')
  return {
    'Content-Type': 'application/json',
    'x-auth': JSON.stringify(auth)
  }
}

// Charger toutes les catégories
async function load() {
  try {
    const res = await fetch(`/api/${orgSlug}/categories`, { headers: getAuthHeaders() })
    const data = await res.json()
    categories.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)
    categories.value = []
  }
}

// Drag & Drop simplifié (manuel)
function startDrag(id) {
  draggingId.value = id
  document.onmouseup = stopDrag
  document.onmousemove = onDrag
}

function onDrag(e) {
  const dragIndex = categories.value.findIndex(c => c.id === draggingId.value)
  if (dragIndex === -1) return

  const element = categories.value[dragIndex]
  const mouseY = e.clientY

  // Trouver l'index à déplacer
  let newIndex = dragIndex
  for (let i = 0; i < categories.value.length; i++) {
    const el = document.querySelectorAll('.cursor-move')[i]
    const rect = el.getBoundingClientRect()
    if (mouseY > rect.top + rect.height / 2) {
      newIndex = i
    }
  }

  if (newIndex !== dragIndex) {
    categories.value.splice(dragIndex, 1)
    categories.value.splice(newIndex, 0, element)
  }
}

function stopDrag() {
  draggingId.value = null
  document.onmouseup = null
  document.onmousemove = null
  saveOrder()
}

// Ajouter ou modifier
async function save() {
  try {
    const url = form.id ? `/api/${orgSlug}/categories/${form.id}` : `/api/${orgSlug}/categories`
    const method = form.id ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: form.name })
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Erreur lors de l’opération.')
    } else {
      form.id = null
      form.name = ''
      load()
    }
  } catch (err) {
    console.error(err)
  }
}

// Supprimer
async function del(id) {
  if (!confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return
  try {
    const res = await fetch(`/api/${orgSlug}/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Erreur lors de la suppression.')
    } else {
      load()
    }
  } catch (err) {
    console.error(err)
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

// Sauvegarder l'ordre
async function saveOrder() {
  try {
    await fetch(`/api/${orgSlug}/categories/order`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        order: categories.value.map((c, index) => ({
          id: c.id,
          sort_order: index
        }))
      })
    })
  } catch (err) {
    console.error(err)
  }
}

onMounted(load)
</script>
