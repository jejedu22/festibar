<!-- frontend/src/pages/AdminPage.vue : carte, produits -->
<template>
  <ManagerShell>
    <div class="space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display font-bold text-[26px] lg:text-[32px] tracking-tight">Carte</h1>
          <p class="text-sm text-slate-600 mt-0.5">
            {{ products.length }} produit{{ products.length > 1 ? 's' : '' }}<span v-if="soldOutCount"> · {{ soldOutCount }} épuisé{{ soldOutCount > 1 ? 's' : '' }}</span>
          </p>
        </div>
        <button type="button" class="btn-primary min-h-[48px] px-4 lg:px-5" @click="openCreate">
          <Icon name="plus" :stroke="2.2" /><span class="hidden sm:inline">Nouveau produit</span><span class="sm:hidden">Produit</span>
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <CarteTabs />
        <label class="flex-1 basis-56 flex items-center gap-2.5 min-h-[48px] px-3.5 border border-slate-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-600">
          <Icon name="search" class="text-slate-600" />
          <span class="sr-only">Rechercher un produit</span>
          <input v-model="query" type="search" placeholder="Rechercher un produit…" class="flex-1 min-w-0 bg-transparent outline-none text-base" />
        </label>
      </div>

      <p v-if="loading" class="text-slate-600">Chargement…</p>
      <div v-else-if="!products.length" class="card p-8 text-center text-slate-600 space-y-2">
        <p>Aucun produit pour le moment.</p>
        <p v-if="!categories.length" class="text-sm">
          Astuce : créez d’abord des <router-link :to="`/${orgSlug}/categories`" class="underline text-blue-700">catégories</router-link> pour organiser la carte.
        </p>
        <button type="button" class="btn-primary mt-2" @click="openCreate"><Icon name="plus" />Ajouter un produit</button>
      </div>
      <p v-else-if="!groups.length" class="card p-8 text-center text-slate-600">Aucun produit ne correspond à « {{ query }} ».</p>

      <!-- Produits groupés par catégorie -->
      <section v-for="g in groups" :key="g.id" class="card overflow-hidden" :aria-label="g.name">
        <div class="flex items-center justify-between px-4 lg:px-5 py-3 bg-slate-50 border-b border-slate-200">
          <h2 class="text-[15px] font-semibold">{{ g.name }}</h2>
          <span class="text-[13px] text-slate-600">{{ g.products.length }} produit{{ g.products.length > 1 ? 's' : '' }}</span>
        </div>
        <ul>
          <li
            v-for="p in g.products"
            :key="p.id"
            class="flex items-center gap-2 lg:gap-3.5 pl-4 lg:pl-5 pr-2 lg:pr-4 py-2 border-t border-slate-100 first:border-t-0 min-h-[64px]"
            :class="{ 'bg-blue-50': panelOpen && form.id === p.id }"
          >
            <button type="button" class="flex-1 min-w-0 min-h-[44px] text-left" :aria-label="`Modifier ${p.name}`" @click="edit(p)">
              <span class="block font-semibold truncate" :class="p.available ? 'text-ink' : 'text-slate-500'">{{ p.name }}</span>
              <span class="block text-sm text-slate-600">
                {{ formatPrice(p.price) }} ·
                <span class="font-medium" :class="p.available ? 'text-green-900' : 'text-red-900'">{{ p.available ? 'En vente' : 'Épuisé' }}</span>
              </span>
            </button>
            <ToggleSwitch
              :model-value="!!p.available"
              :label="`${p.name} en vente`"
              :disabled="toggling.has(p.id)"
              @update:model-value="toggleAvailability(p)"
            />
            <div class="hidden sm:flex gap-1.5">
              <button type="button" class="icon-btn" :aria-label="`Modifier ${p.name}`" @click="edit(p)"><Icon name="edit" :size="19" /></button>
              <button type="button" class="icon-btn border-red-200 text-red-700 hover:bg-red-50" :aria-label="`Supprimer ${p.name}`" @click="del(p)"><Icon name="trash" :size="19" /></button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <SidePanel :open="panelOpen" :title="form.id ? editedName : 'Nouveau produit'" :kicker="form.id ? 'Modifier le produit' : ''" @close="panelOpen = false">
      <form id="product-form" class="p-5 space-y-5" @submit.prevent="save">
        <label class="block">
          <span class="label">Nom</span>
          <input v-model="form.name" maxlength="100" class="field" required />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="label">Prix TTC</span>
            <span class="flex items-center border border-slate-400 rounded-[10px] overflow-hidden focus-within:ring-2 focus-within:ring-blue-600">
              <input v-model.number="form.price" type="number" inputmode="decimal" min="0" max="10000" step="0.01" class="flex-1 min-w-0 min-h-[48px] px-3.5 text-base outline-none" required />
              <span class="px-3.5 text-slate-600" aria-hidden="true">€</span>
            </span>
          </label>
          <label class="block">
            <span class="label">Catégorie</span>
            <select v-model="form.category_id" class="field px-2.5">
              <option :value="null">— Aucune —</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </label>
        </div>
        <label class="flex items-center gap-3 min-h-[44px]">
          <input v-model="form.available" type="checkbox" class="w-[22px] h-[22px] accent-blue-600" />
          Disponible à la vente
        </label>
        <p class="p-3 bg-slate-50 border border-slate-200 rounded-[10px] text-[13px] leading-snug text-slate-700">
          Un produit déjà vendu ne peut pas être supprimé : marquez-le « Épuisé » pour conserver l’historique des ventes.
        </p>
        <button v-if="form.id" type="button" class="btn-danger text-sm" @click="del({ id: form.id, name: editedName })">
          <Icon name="trash" :size="17" />Supprimer le produit
        </button>
      </form>
      <template #footer>
        <div class="flex gap-2.5">
          <button type="button" class="btn-secondary min-h-[52px] px-5 text-base" @click="panelOpen = false">Annuler</button>
          <button type="submit" form="product-form" class="btn-primary flex-1 min-h-[52px] text-base" :disabled="saving">
            {{ saving ? 'Enregistrement…' : form.id ? 'Enregistrer' : 'Ajouter le produit' }}
          </button>
        </div>
      </template>
    </SidePanel>
  </ManagerShell>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { api } from '@/utils/api'
import { formatPrice } from '@/utils/format'
import ManagerShell from '@/components/ManagerShell.vue'
import CarteTabs from '@/components/CarteTabs.vue'
import SidePanel from '@/components/SidePanel.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import Icon from '@/components/Icon.vue'

const route = useRoute()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()
const ui = useUiStore()

const products = ref([])
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const query = ref('')
const panelOpen = ref(false)
const editedName = ref('')
const toggling = reactive(new Set())
const empty = () => ({ id: null, name: '', price: 0, category_id: null, available: true })
const form = reactive(empty())

const soldOutCount = computed(() => products.value.filter(p => !p.available).length)

// Produits groupés dans l'ordre des catégories (celui de la page de commande), puis « Sans catégorie »
const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const visible = products.value
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const known = new Set(categories.value.map(c => c.id))
  const list = categories.value.map(c => ({ id: c.id, name: c.name, products: visible.filter(p => p.category_id === c.id) }))
  list.push({ id: 'none', name: 'Sans catégorie', products: visible.filter(p => !known.has(p.category_id)) })
  return list.filter(g => g.products.length)
})

function openCreate() {
  Object.assign(form, empty())
  panelOpen.value = true
}

function edit(p) {
  Object.assign(form, { id: p.id, name: p.name, price: p.price, category_id: p.category_id || null, available: !!p.available })
  editedName.value = p.name
  panelOpen.value = true
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
    panelOpen.value = false
    await load()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    saving.value = false
  }
}

async function toggleAvailability(p) {
  toggling.add(p.id)
  try {
    await org.orgApi(`/products/${p.id}/availability`, { method: 'PATCH', body: { available: !p.available } })
    p.available = p.available ? 0 : 1
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    toggling.delete(p.id)
  }
}

async function del(p) {
  const ok = await ui.confirm({ title: `Supprimer « ${p.name} » ?`, confirmLabel: 'Supprimer', danger: true })
  if (!ok) return
  try {
    await org.orgApi(`/products/${p.id}`, { method: 'DELETE' })
    ui.success('Produit supprimé.')
    if (form.id === p.id) panelOpen.value = false
    await load()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

onMounted(load)
</script>
