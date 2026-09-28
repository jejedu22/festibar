<!-- frontend/src/pages/CategoriesPage.vue -->
<template>
  <div class="max-w-2xl mx-auto p-4">
    <ManagerNav />
    <h1 class="text-2xl font-bold mb-1">Catégories</h1>
    <p class="text-sm text-gray-700 mb-4">L’ordre ci-dessous est celui de la page de commande (glisser ☰ ou flèches).</p>

    <p v-if="loading" class="text-gray-600">Chargement…</p>
    <p v-else-if="!categories.length" class="text-gray-600">Aucune catégorie.</p>
    <ul v-else ref="list">
      <li
        v-for="(category, index) in categories"
        :key="category.id"
        class="flex items-center gap-2 border p-2 mb-2 rounded-lg bg-white"
        :class="{ 'bg-slate-200': draggingId === category.id }"
      >
        <span
          class="cursor-grab select-none px-2 text-xl touch-none"
          aria-hidden="true"
          @mousedown.prevent="startDrag(category.id)"
          @touchstart.prevent="startDrag(category.id)"
        >☰</span>
        <span class="flex-1 truncate">{{ category.name }}</span>
        <button type="button" class="px-2 py-1 rounded bg-gray-100 disabled:opacity-30" :disabled="index === 0" :aria-label="`Monter ${category.name}`" @click="move(index, -1)">↑</button>
        <button type="button" class="px-2 py-1 rounded bg-gray-100 disabled:opacity-30" :disabled="index === categories.length - 1" :aria-label="`Descendre ${category.name}`" @click="move(index, 1)">↓</button>
        <button type="button" class="bg-blue-100 px-2 py-1 rounded" :aria-label="`Renommer ${category.name}`" @click="edit(category)">✏️</button>
        <button type="button" class="bg-red-100 px-2 py-1 rounded" :aria-label="`Supprimer ${category.name}`" @click="del(category)">🗑️</button>
      </li>
    </ul>

    <form class="mt-4 space-y-2 bg-gray-50 border rounded-xl p-4" @submit.prevent="save">
      <label class="block">
        <span class="text-sm font-medium">{{ form.id ? 'Renommer la catégorie' : 'Nouvelle catégorie' }}</span>
        <input ref="nameInput" v-model="form.name" maxlength="60" class="w-full p-2 border rounded mt-1" required />
      </label>
      <div class="flex gap-2">
        <button class="flex-1 bg-green-600 text-white p-2 rounded">{{ form.id ? '💾 Enregistrer' : '➕ Ajouter' }}</button>
        <button v-if="form.id" type="button" class="px-4 bg-gray-300 rounded" @click="cancelEdit">Annuler</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { api } from '@/utils/api'
import ManagerNav from '@/components/ManagerNav.vue'

const route = useRoute()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()
const ui = useUiStore()

const categories = ref([])
const loading = ref(true)
const form = reactive({ id: null, name: '' })
const nameInput = ref(null)
const list = ref(null)
const draggingId = ref(null)

async function load() {
  try {
    categories.value = await api(`/api/${orgSlug}/categories`)
  } catch (err) {
    ui.error(err.message)
  } finally {
    loading.value = false
  }
}

// --- Réorganisation : flèches (accessible au clavier) ou glisser-déposer ---
function move(index, delta) {
  const arr = categories.value
  ;[arr[index], arr[index + delta]] = [arr[index + delta], arr[index]]
  saveOrder()
}

function startDrag(id) {
  draggingId.value = id
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchend', stopDrag)
}

function onDrag(e) {
  if (e.cancelable) e.preventDefault()
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const from = categories.value.findIndex(c => c.id === draggingId.value)
  if (from === -1) return
  // Nouvelle position = nombre d'autres lignes dont le milieu est au-dessus du doigt
  let to = 0
  ;[...list.value.children].forEach((el, i) => {
    if (i === from) return
    const rect = el.getBoundingClientRect()
    if (clientY > rect.top + rect.height / 2) to++
  })
  if (to !== from) {
    const [item] = categories.value.splice(from, 1)
    categories.value.splice(to, 0, item)
  }
}

function stopDrag() {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)
  if (draggingId.value !== null) saveOrder()
  draggingId.value = null
}

async function saveOrder() {
  try {
    await org.orgApi('/categories/order', {
      method: 'PUT',
      body: { order: categories.value.map((c, index) => ({ id: c.id, sort_order: index })) },
    })
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
    load()
  }
}

async function save() {
  try {
    if (form.id) await org.orgApi(`/categories/${form.id}`, { method: 'PUT', body: { name: form.name } })
    else await org.orgApi('/categories', { method: 'POST', body: { name: form.name } })
    ui.success(form.id ? 'Catégorie renommée.' : 'Catégorie ajoutée.')
    cancelEdit()
    load()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

async function del(category) {
  const ok = await ui.confirm({ title: `Supprimer « ${category.name} » ?`, confirmLabel: 'Supprimer', danger: true })
  if (!ok) return
  try {
    await org.orgApi(`/categories/${category.id}`, { method: 'DELETE' })
    ui.success('Catégorie supprimée.')
    load()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

function edit(category) {
  form.id = category.id
  form.name = category.name
  nextTick(() => nameInput.value?.focus())
}

function cancelEdit() {
  form.id = null
  form.name = ''
}

onMounted(load)
</script>
