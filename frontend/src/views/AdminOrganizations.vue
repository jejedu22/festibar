<!-- frontend/src/views/AdminOrganizations.vue -->
<template>
  <div class="max-w-xl mx-auto p-4">
    <div class="flex justify-between items-center mb-2">
      <h1 class="text-xl font-bold">🛠️ Administration · Organisations</h1>
      <button class="text-sm text-red-700 underline" @click="logout()">Déconnexion</button>
    </div>

    <!-- Formulaire -->
    <form class="mt-2 space-y-3 bg-gray-50 border rounded-xl p-4" @submit.prevent="save">
      <h2 class="font-semibold">{{ form.id ? 'Modifier l’organisation' : 'Nouvelle organisation' }}</h2>
      <label class="block">
        <span class="text-sm font-medium">Nom</span>
        <input ref="nameInput" v-model="form.name" maxlength="100" class="w-full p-2 border rounded mt-1" required />
      </label>
      <label class="block">
        <span class="text-sm font-medium">Identifiant dans l’adresse (slug)</span>
        <input
          v-model="form.slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxlength="60"
          class="w-full p-2 border rounded mt-1"
          required
          @input="onSlugInput"
        />
        <span class="text-xs text-gray-600">Adresse de prise de commande : {{ origin }}/{{ form.slug || '…' }}</span>
      </label>
      <label class="block">
        <span class="text-sm font-medium">Mot de passe gestionnaire</span>
        <input
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          minlength="8"
          class="w-full p-2 border rounded mt-1"
          :placeholder="form.id ? 'Laisser vide pour ne pas changer' : ''"
          :required="!form.id"
        />
        <span class="text-xs text-gray-600">Accès complet : produits, ventes, exports. 8 caractères minimum.</span>
      </label>
      <label class="block">
        <span class="text-sm font-medium">Mot de passe serveurs (optionnel)</span>
        <input
          v-model="form.staff_password"
          type="password"
          autocomplete="new-password"
          minlength="8"
          class="w-full p-2 border rounded mt-1"
          :placeholder="form.id && form.has_staff_password ? 'Laisser vide pour ne pas changer' : ''"
        />
        <span class="text-xs text-gray-600">Prise de commande uniquement, à partager avec les bénévoles.</span>
      </label>
      <label v-if="form.id && form.has_staff_password && !form.staff_password" class="flex items-center gap-2 text-sm">
        <input v-model="form.remove_staff_password" type="checkbox" />
        Supprimer le mot de passe serveurs
      </label>

      <div class="flex gap-2">
        <button class="flex-1 bg-green-600 text-white p-2 rounded disabled:opacity-50" :disabled="saving">
          {{ form.id ? '💾 Enregistrer' : '➕ Ajouter' }}
        </button>
        <button v-if="form.id" type="button" class="px-4 bg-gray-300 rounded" @click="reset">Annuler</button>
      </div>
    </form>

    <!-- Liste -->
    <p v-if="loading" class="mt-6 text-gray-600">Chargement…</p>
    <ul v-else class="mt-6 space-y-2">
      <li v-for="o in organizations" :key="o.id" class="flex justify-between items-center gap-2 border p-2 rounded-lg">
        <div class="min-w-0">
          <p class="font-semibold truncate">{{ o.name }}</p>
          <p class="text-sm text-gray-600">/{{ o.slug }} · {{ o.has_staff_password ? 'accès serveurs activé' : 'pas d’accès serveurs' }}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="bg-yellow-200 px-2 py-1 rounded" :aria-label="`Modifier ${o.name}`" @click="edit(o)">🖊️</button>
          <button class="bg-red-200 px-2 py-1 rounded" :aria-label="`Supprimer ${o.name}`" @click="del(o)">🗑️</button>
          <router-link :to="`/${o.slug}/login`" class="bg-blue-200 px-2 py-1 rounded" :aria-label="`Ouvrir ${o.name}`">➡️</router-link>
        </div>
      </li>
      <li v-if="!organizations.length" class="text-gray-600 italic text-center">Aucune organisation enregistrée.</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api'
import { getAdminToken, clearAdminToken } from '@/utils/adminAuth'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const ui = useUiStore()
const origin = window.location.origin

const organizations = ref([])
const loading = ref(true)
const saving = ref(false)
const nameInput = ref(null)
const slugManuallyEdited = ref(false)

const empty = () => ({ id: null, name: '', slug: '', password: '', staff_password: '', has_staff_password: false, remove_staff_password: false })
const form = reactive(empty())

const adminApi = (url, options = {}) => api(url, { ...options, token: getAdminToken() })

// --- Slug généré à partir du nom ---
function generateSlug(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
}

watch(() => form.name, name => {
  if (!slugManuallyEdited.value) form.slug = generateSlug(name)
})

function onSlugInput() {
  slugManuallyEdited.value = true
}

function reset() {
  Object.assign(form, empty())
  slugManuallyEdited.value = false
}

function edit(o) {
  Object.assign(form, { ...empty(), id: o.id, name: o.name, slug: o.slug, has_staff_password: !!o.has_staff_password })
  slugManuallyEdited.value = true
  nextTick(() => nameInput.value?.focus())
}

async function loadOrganizations() {
  try {
    organizations.value = await adminApi('/api/admin/organizations')
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  const body = { name: form.name, slug: form.slug }
  if (form.password) body.password = form.password
  if (form.staff_password) body.staff_password = form.staff_password
  if (form.remove_staff_password) body.remove_staff_password = true
  try {
    if (form.id) await adminApi(`/api/admin/organizations/${form.id}`, { method: 'PUT', body })
    else await adminApi('/api/admin/organizations', { method: 'POST', body })
    ui.success(form.id ? 'Organisation enregistrée.' : 'Organisation créée.')
    reset()
    await loadOrganizations()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    saving.value = false
  }
}

async function del(o) {
  const ok = await ui.confirm({ title: `Supprimer « ${o.name} » ?`, confirmLabel: 'Supprimer', danger: true, requireText: o.slug })
  if (!ok) return
  try {
    await adminApi(`/api/admin/organizations/${o.id}`, { method: 'DELETE' })
    ui.success('Organisation supprimée.')
    await loadOrganizations()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

function logout() {
  clearAdminToken()
  router.push('/')
}

onMounted(loadOrganizations)
</script>
