<!-- frontend/src/pages/AdminPage.vue -->
<template>
  <div class="max-w-2xl mx-auto p-4">
    <ManagerNav />
    <h1 class="text-2xl font-bold mb-4">Produits</h1>

    <!-- Formulaire produit -->
    <form class="space-y-3 bg-gray-50 border rounded-xl p-4" @submit.prevent="save">
      <h2 class="font-semibold">{{ form.id ? 'Modifier le produit' : 'Nouveau produit' }}</h2>
      <label class="block">
        <span class="text-sm font-medium">Nom</span>
        <input ref="nameInput" v-model="form.name" maxlength="100" class="w-full p-2 border rounded mt-1" required />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium">Prix TTC (€)</span>
          <input v-model.number="form.price" type="number" inputmode="decimal" min="0" max="10000" step="0.01" class="w-full p-2 border rounded mt-1" required />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Catégorie</span>
          <select v-model="form.category_id" class="w-full p-2 border rounded mt-1">
            <option :value="null">— Aucune —</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </label>
      </div>
      <label class="flex items-center gap-2">
        <input v-model="form.available" type="checkbox" class="w-5 h-5" />
        <span>Disponible à la vente</span>
      </label>
      <div class="flex gap-2">
        <button class="flex-1 bg-green-600 text-white p-2 rounded disabled:opacity-50" :disabled="saving">
          {{ form.id ? '💾 Enregistrer' : '➕ Ajouter' }}
        </button>
        <button v-if="form.id" type="button" class="px-4 bg-gray-300 rounded" @click="reset">Annuler</button>
      </div>
      <p v-if="!categories.length" class="text-sm text-gray-600">
        Astuce : créez d’abord des <router-link :to="`/${orgSlug}/categories`" class="underline">catégories</router-link> pour organiser la carte.
      </p>
    </form>

    <!-- Liste des produits -->
    <p v-if="loading" class="mt-6 text-gray-600">Chargement…</p>
    <p v-else-if="!products.length" class="mt-6 text-gray-600">Aucun produit.</p>
    <ul v-else class="mt-6 space-y-2">
      <li
        v-for="product in products"
        :key="product.id"
        class="flex items-center justify-between gap-2 border rounded-lg p-2"
        :class="{ 'bg-gray-100': !product.available }"
      >
        <div class="min-w-0">
          <p class="font-semibold truncate" :class="{ 'line-through text-gray-500': !product.available }">{{ product.name }}</p>
          <p class="text-sm text-gray-700">
            {{ formatPrice(product.price) }}<span v-if="product.category_name"> · {{ product.category_name }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="px-2 py-1 rounded text-sm"
            :class="product.available ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'"
            :aria-label="product.available ? `Marquer ${product.name} comme épuisé` : `Remettre ${product.name} en vente`"
            @click="toggleAvailability(product)"
          >{{ product.available ? 'En vente' : 'Épuisé' }}</button>
          <button type="button" class="bg-yellow-200 px-2 py-1 rounded" :aria-label="`Modifier ${product.name}`" @click="edit(product)">🖊️</button>
          <button type="button" class="bg-red-200 px-2 py-1 rounded" :aria-label="`Supprimer ${product.name}`" @click="del(product)">🗑️</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { api } from '@/utils/api'
import { formatPrice } from '@/utils/format'
import ManagerNav from '@/components/ManagerNav.vue'

const route = useRoute()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()
const ui = useUiStore()

const nameInput = ref(null)
const products = ref([])
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const empty = () => ({ id: null, name: '', price: 0, category_id: null, available: true })
const form = reactive(empty())

function reset() {
  Object.assign(form, empty())
}

function edit(p) {
  Object.assign(form, { id: p.id, name: p.name, price: p.price, category_id: p.category_id || null, available: !!p.available })
  window.scrollTo({ top: 0, behavior: 'smooth' })
  nextTick(() => nameInput.value?.focus())
}

async function load() {
  try {
    const [p, c] = await Promise.all([api(`/api/${orgSlug}/products`), api(`/api/${orgSlug}/categories`)])
    products.value = p
    categories.value = c
  } catch (err) {
    ui.error(err.message)
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const body = { name: form.name, price: form.price, category_id: form.category_id, available: form.available }
    if (form.id) await org.orgApi(`/products/${form.id}`, { method: 'PUT', body })
    else await org.orgApi('/products', { method: 'POST', body })
    ui.success(form.id ? 'Produit enregistré.' : 'Produit ajouté.')
    reset()
    await load()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    saving.value = false
  }
}

async function toggleAvailability(p) {
  try {
    await org.orgApi(`/products/${p.id}/availability`, { method: 'PATCH', body: { available: !p.available } })
    p.available = p.available ? 0 : 1
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

async function del(p) {
  const ok = await ui.confirm({ title: `Supprimer « ${p.name} » ?`, confirmLabel: 'Supprimer', danger: true })
  if (!ok) return
  try {
    await org.orgApi(`/products/${p.id}`, { method: 'DELETE' })
    ui.success('Produit supprimé.')
    if (form.id === p.id) reset()
    await load()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

onMounted(load)
</script>
