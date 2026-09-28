<!-- frontend/src/pages/OrderPage.vue -->
<template>
  <div class="max-w-3xl mx-auto pb-44">
    <!-- En-tête -->
    <header class="sticky top-0 bg-white z-20 border-b px-4 pt-3 pb-2">
      <div class="flex items-center justify-between gap-2">
        <h1 class="text-xl font-bold truncate">🎪 {{ org.organizationName }}</h1>
        <div class="flex items-center gap-3 text-sm shrink-0">
          <router-link v-if="org.isManager" :to="`/${orgSlug}/admin`" class="text-blue-700 underline">Gestion</router-link>
          <button class="text-gray-600 underline" @click="logout">Déconnexion</button>
        </div>
      </div>

      <!-- État réseau / synchronisation -->
      <p v-if="!online" class="mt-2 text-sm bg-orange-100 text-orange-900 rounded px-2 py-1" role="status">
        📡 Hors-ligne : les commandes sont gardées sur ce téléphone et envoyées au retour du réseau.
      </p>
      <p v-if="pendingCount" class="mt-2 text-sm bg-yellow-100 text-yellow-900 rounded px-2 py-1" role="status">
        ⏳ {{ pendingCount }} commande(s) en attente d’envoi
      </p>
      <p v-if="failedCount" class="mt-2 text-sm bg-red-100 text-red-900 rounded px-2 py-1" role="alert">
        ⚠️ {{ failedCount }} commande(s) hors-ligne refusée(s) par le serveur : prévenez le gestionnaire.
      </p>

      <!-- Raccourcis catégories -->
      <nav v-if="categoriesWithProducts.length > 1" class="flex gap-2 overflow-x-auto mt-2 pb-1" aria-label="Catégories">
        <a
          v-for="cat in categoriesWithProducts"
          :key="cat.id"
          :href="`#cat-${cat.id}`"
          class="shrink-0 px-3 py-1 rounded-full bg-gray-100 text-sm"
          @click.prevent="scrollTo(cat.id)"
        >{{ cat.name }}</a>
      </nav>
    </header>

    <p v-if="loading" class="p-4 text-gray-600">Chargement de la carte…</p>
    <p v-else-if="!categoriesWithProducts.length" class="p-4 text-gray-600">
      Aucun produit pour le moment.
      <router-link v-if="org.isManager" :to="`/${orgSlug}/admin`" class="underline">Ajouter des produits</router-link>
    </p>

    <!-- Produits : un appui = +1 -->
    <section v-for="cat in categoriesWithProducts" :id="`cat-${cat.id}`" :key="cat.id" class="px-4 pt-4 scroll-mt-32">
      <h2 class="text-lg font-semibold mb-2">{{ cat.name }}</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div v-for="p in cat.products" :key="p.id" class="relative">
          <button
            type="button"
            class="w-full min-h-[5.5rem] rounded-xl border-2 p-3 text-left flex flex-col justify-between transition active:scale-95"
            :class="p.available
              ? (cart[p.id] ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white shadow-sm')
              : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'"
            :disabled="!p.available"
            :aria-label="p.available ? `Ajouter ${p.name}, ${formatPrice(p.price)}` : `${p.name} épuisé`"
            @click="add(p.id)"
          >
            <span class="font-semibold leading-tight pr-8">{{ p.name }}</span>
            <span class="text-sm" :class="p.available ? 'text-gray-700' : 'text-red-700 font-medium'">
              {{ p.available ? formatPrice(p.price) : 'Épuisé' }}
            </span>
          </button>
          <template v-if="cart[p.id]">
            <span class="absolute top-2 right-2 bg-blue-600 text-white rounded-full min-w-[1.75rem] h-7 px-1 flex items-center justify-center font-bold" aria-hidden="true">
              {{ cart[p.id] }}
            </span>
            <button
              type="button"
              class="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-red-100 text-red-800 text-2xl leading-none"
              :aria-label="`Retirer un ${p.name}`"
              @click="remove(p.id)"
            >−</button>
          </template>
        </div>
      </div>
    </section>

    <p class="px-4 mt-6 text-xs text-gray-600">🔞 La vente d’alcool aux mineurs est interdite : en cas de doute, demandez une pièce d’identité.</p>

    <!-- Barre de validation -->
    <div class="fixed bottom-0 inset-x-0 bg-white border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-20">
      <div class="max-w-3xl mx-auto p-3 space-y-2">
        <div class="flex justify-between items-baseline">
          <span class="text-gray-700">{{ itemCount }} article{{ itemCount > 1 ? 's' : '' }}</span>
          <span class="text-2xl font-bold" aria-live="polite">{{ formatPrice(total) }}</span>
        </div>
        <div class="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Moyen de paiement">
          <button
            v-for="m in PAYMENT_METHODS"
            :key="m.value"
            type="button"
            role="radio"
            :aria-checked="paymentMethod === m.value"
            class="py-2 rounded-lg border text-sm"
            :class="paymentMethod === m.value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white'"
            @click="paymentMethod = m.value"
          >{{ m.icon }} {{ m.label }}</button>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="px-4 rounded-lg bg-gray-200 disabled:opacity-40"
            :disabled="!itemCount || submitting"
            @click="clearCart"
          >Vider</button>
          <button
            type="button"
            class="flex-1 min-h-[3.5rem] rounded-lg bg-blue-600 text-white text-lg font-semibold disabled:opacity-40"
            :disabled="!itemCount || submitting"
            @click="submitOrder"
          >{{ submitting ? 'Envoi…' : 'Valider la commande' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { api } from '@/utils/api'
import { formatPrice, PAYMENT_METHODS } from '@/utils/format'
import { readJSON, writeJSON } from '@/utils/storage'
import { uuid } from '@/utils/uuid'
import { enqueue, flush, pendingCount, failedCount } from '@/utils/offlineQueue'

const router = useRouter()
const route = useRoute()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()
const ui = useUiStore()

const MENU_KEY = `menu:${orgSlug}`
const CART_KEY = `cart:${orgSlug}`

// Carte (mise en cache pour fonctionner hors-ligne)
const cachedMenu = readJSON(MENU_KEY, { products: [], categories: [] })
const products = ref(cachedMenu.products)
const categories = ref(cachedMenu.categories)
const loading = ref(!products.value.length)

// Panier conservé en cas de rechargement de la page
const cart = reactive(readJSON(CART_KEY, {}))
const paymentMethod = ref('cash')
const submitting = ref(false)
const online = ref(navigator.onLine)

watch(cart, value => writeJSON(CART_KEY, value), { deep: true })

const productById = computed(() => new Map(products.value.map(p => [p.id, p])))

const cartLines = computed(() =>
  Object.entries(cart)
    .map(([id, quantity]) => ({ product: productById.value.get(Number(id)), quantity }))
    .filter(l => l.product && l.quantity > 0)
)
const itemCount = computed(() => cartLines.value.reduce((n, l) => n + l.quantity, 0))
const total = computed(() => Math.round(cartLines.value.reduce((s, l) => s + l.quantity * l.product.price, 0) * 100) / 100)

const categoriesWithProducts = computed(() => {
  const list = categories.value.map(cat => ({
    ...cat,
    products: products.value.filter(p => p.category_id === cat.id).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  }))
  const orphans = products.value.filter(p => !categories.value.some(c => c.id === p.category_id))
  if (orphans.length) list.push({ id: 'autres', name: 'Autres', products: orphans })
  return list.filter(c => c.products.length)
})

function add(id) {
  if (navigator.vibrate) navigator.vibrate(10)
  cart[id] = Math.min(99, (cart[id] || 0) + 1)
}

function remove(id) {
  cart[id] = Math.max(0, (cart[id] || 0) - 1)
  if (!cart[id]) delete cart[id]
}

function clearCart() {
  Object.keys(cart).forEach(k => delete cart[k])
}

function scrollTo(id) {
  document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth' })
}

async function loadMenu() {
  try {
    const [p, c] = await Promise.all([api(`/api/${orgSlug}/products`), api(`/api/${orgSlug}/categories`)])
    products.value = p
    categories.value = c
    writeJSON(MENU_KEY, { products: p, categories: c })
    // Retire du panier les produits supprimés
    Object.keys(cart).forEach(id => { if (!productById.value.has(Number(id))) delete cart[id] })
  } catch (err) {
    if (!products.value.length) ui.error(err.message)
  } finally {
    loading.value = false
  }
}

async function submitOrder() {
  if (!itemCount.value || submitting.value) return
  submitting.value = true

  const lines = cartLines.value.map(l => ({ productId: l.product.id, name: l.product.name, price: l.product.price, quantity: l.quantity }))
  const order = { clientId: uuid(), items: lines, paymentMethod: paymentMethod.value, total: total.value }

  try {
    const saved = await org.orgApi('/orders', {
      method: 'POST',
      body: { items: lines.map(l => ({ productId: l.productId, quantity: l.quantity })), paymentMethod: order.paymentMethod, clientId: order.clientId },
    })
    sessionStorage.setItem('lastOrder', JSON.stringify(saved))
    clearCart()
    paymentMethod.value = 'cash'
    router.push({ path: `/${orgSlug}/summary`, query: { orderId: saved.orderId } })
  } catch (err) {
    if (err.network) {
      // Pas de réseau : la commande est gardée et sera envoyée plus tard
      enqueue(orgSlug, { ...order, createdAt: new Date().toISOString() })
      sessionStorage.setItem('lastOrder', JSON.stringify({ ...order, pending: true }))
      clearCart()
      paymentMethod.value = 'cash'
      router.push({ path: `/${orgSlug}/summary`, query: { pending: order.clientId } })
    } else if (err.status === 409 && err.data?.unavailable) {
      ui.error(err.message)
      loadMenu()
    } else if (err.status !== 401) {
      ui.error(err.message)
    }
  } finally {
    submitting.value = false
  }
}

async function logout() {
  if (itemCount.value && !(await ui.confirm({ title: 'Se déconnecter ?', message: 'Le panier en cours sera conservé sur ce téléphone.' }))) return
  org.logout()
  router.push(`/${orgSlug}/login`)
}

// --- Réseau, synchronisation, rafraîchissement de la carte ---
const sync = () => flush(orgSlug, org.token)
const setOnline = () => { online.value = true; sync(); loadMenu() }
const setOffline = () => (online.value = false)
let timer

// Garde l'écran allumé pendant le service
let wakeLock = null
async function keepAwake() {
  try {
    if (document.visibilityState === 'visible' && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen')
  } catch { /* non supporté ou refusé */ }
}

onMounted(() => {
  loadMenu()
  sync()
  timer = setInterval(() => { loadMenu(); sync() }, 30000)
  window.addEventListener('online', setOnline)
  window.addEventListener('offline', setOffline)
  document.addEventListener('visibilitychange', keepAwake)
  keepAwake()
})

onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('online', setOnline)
  window.removeEventListener('offline', setOffline)
  document.removeEventListener('visibilitychange', keepAwake)
  wakeLock?.release().catch(() => {})
})
</script>
