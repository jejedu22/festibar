<!-- frontend/src/pages/CategoriesPage.vue -->
<template>
  <ManagerShell>
    <div class="space-y-5">
      <div>
        <h1 class="font-display font-bold text-[26px] lg:text-[32px] tracking-tight">Carte</h1>
        <p class="text-sm text-slate-600 mt-0.5">L’ordre des catégories est celui de la page de commande : glissez la poignée ou utilisez les flèches.</p>
      </div>

      <CarteTabs />

      <!-- Ajout / renommage -->
      <form class="card p-4 lg:p-5" @submit.prevent="save">
        <label class="block">
          <span class="label">{{ form.id ? 'Renommer la catégorie' : 'Nouvelle catégorie' }}</span>
          <span class="flex flex-wrap gap-2">
            <input ref="nameInput" v-model="form.name" maxlength="60" class="field flex-1 basis-52" placeholder="Ex. Bières, Softs, Restauration" required />
            <button class="btn-primary min-h-[48px] px-5">
              <Icon :name="form.id ? 'edit' : 'plus'" :size="18" />{{ form.id ? 'Enregistrer' : 'Ajouter' }}
            </button>
            <button v-if="form.id" type="button" class="btn-secondary min-h-[48px]" @click="cancelEdit">Annuler</button>
          </span>
        </label>
      </form>

      <p v-if="loading" class="text-slate-600">Chargement…</p>
      <p v-else-if="!categories.length" class="card p-8 text-center text-slate-600">Aucune catégorie pour le moment.</p>
      <ul v-else ref="list" class="card overflow-hidden">
        <li
          v-for="(category, index) in categories"
          :key="category.id"
          class="flex items-center gap-1.5 pl-1.5 pr-2 lg:pr-4 py-2 border-t border-slate-100 first:border-t-0 min-h-[64px]"
          :class="draggingId === category.id ? 'bg-blue-50 shadow-inner' : form.id === category.id ? 'bg-blue-50' : 'bg-white'"
        >
          <span
            class="w-11 h-11 inline-flex items-center justify-center cursor-grab select-none touch-none text-slate-500"
            aria-hidden="true"
            @mousedown.prevent="startDrag(category.id)"
            @touchstart.prevent="startDrag(category.id)"
          ><Icon name="grip" :stroke="3" /></span>
          <span class="flex-1 min-w-0 font-semibold break-words">{{ category.name }}</span>
          <button type="button" class="icon-btn disabled:opacity-30" :disabled="index === 0" :aria-label="`Monter ${category.name}`" @click="move(index, -1)"><Icon name="chevronUp" :size="18" /></button>
          <button type="button" class="icon-btn disabled:opacity-30" :disabled="index === categories.length - 1" :aria-label="`Descendre ${category.name}`" @click="move(index, 1)"><Icon name="chevronDown" :size="18" /></button>
          <button type="button" class="icon-btn" :aria-label="`Renommer ${category.name}`" @click="edit(category)"><Icon name="edit" :size="18" /></button>
          <button type="button" class="icon-btn border-red-200 text-red-700 hover:bg-red-50" :aria-label="`Supprimer ${category.name}`" @click="del(category)"><Icon name="trash" :size="18" /></button>
        </li>
      </ul>
    </div>
  </ManagerShell>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { api } from '@/utils/api'
import ManagerShell from '@/components/ManagerShell.vue'
import CarteTabs from '@/components/CarteTabs.vue'
import Icon from '@/components/Icon.vue'

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
