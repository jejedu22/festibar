<!-- frontend/src/pages/OrderSummary.vue -->
<template>
  <div class="max-w-md mx-auto p-4">
    <p class="text-gray-700">{{ org.organizationName }}</p>

    <p v-if="loading" class="mt-6 text-gray-600">Chargement du récapitulatif…</p>
    <p v-else-if="!order" class="mt-6 text-gray-600">Commande introuvable.</p>

    <template v-else>
      <!-- Numéro à annoncer -->
      <div class="text-center my-4">
        <template v-if="order.pending">
          <p class="text-lg font-bold text-yellow-800">⏳ Commande enregistrée hors-ligne</p>
          <p class="text-sm text-gray-600">Elle sera envoyée automatiquement au retour du réseau.</p>
        </template>
        <template v-else>
          <p class="text-sm uppercase tracking-wide text-gray-600">Commande</p>
          <p class="text-6xl font-extrabold">n° {{ order.orderId }}</p>
        </template>
        <p v-if="order.status === 'cancelled'" class="mt-2 font-bold text-red-700">Commande annulée</p>
      </div>

      <ul class="divide-y border-y">
        <li v-for="item in order.items" :key="item.productId" class="flex justify-between py-2">
          <span>{{ item.quantity }} × {{ item.name }}</span>
          <span>{{ formatPrice(item.price * item.quantity) }}</span>
        </li>
      </ul>

      <div class="mt-3 flex justify-between items-baseline">
        <span class="text-gray-700">{{ paymentLabel(order.paymentMethod) }}</span>
        <span class="text-2xl font-bold">Total : {{ formatPrice(order.total) }}</span>
      </div>

      <!-- Rendu de monnaie (espèces) -->
      <section v-if="order.paymentMethod === 'cash' && order.status !== 'cancelled'" class="mt-5" aria-labelledby="received-label">
        <p id="received-label" class="text-sm font-medium mb-2">💶 Argent reçu</p>
        <div class="grid grid-cols-5 gap-2 mb-2">
          <button
            v-for="b in quickAmounts"
            :key="b.label"
            type="button"
            class="py-3 rounded-lg border font-semibold"
            :class="received === b.value ? 'bg-gray-800 text-white' : 'bg-white'"
            @click="received = b.value"
          >{{ b.label }}</button>
        </div>
        <input
          v-model.number="received"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="Autre montant"
          aria-labelledby="received-label"
          class="w-full border rounded-lg px-3 py-2 text-lg"
        />
        <p v-if="received !== null && received !== ''" class="mt-3 text-center text-2xl font-bold" aria-live="polite">
          <span v-if="difference > 0" class="text-green-700">À rendre : {{ formatPrice(difference) }}</span>
          <span v-else-if="difference < 0" class="text-red-700">Il manque : {{ formatPrice(-difference) }}</span>
          <span v-else class="text-gray-700">Compte juste ✅</span>
        </p>
      </section>
    </template>

    <router-link
      :to="`/${orgSlug}/`"
      class="block mt-6 w-full bg-green-600 text-white text-center text-lg font-semibold py-4 rounded-lg"
    >➕ Nouvelle commande</router-link>

    <button
      v-if="order && order.status !== 'cancelled'"
      type="button"
      class="mt-3 w-full border border-red-600 text-red-700 py-3 rounded-lg"
      @click="cancelOrder"
    >Annuler cette commande</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { formatPrice, paymentLabel } from '@/utils/format'
import { removePending } from '@/utils/offlineQueue'

const route = useRoute()
const router = useRouter()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()
const ui = useUiStore()

const order = ref(null)
const loading = ref(true)
const received = ref(null)

const difference = computed(() => Math.round(((Number(received.value) || 0) - (order.value?.total || 0)) * 100) / 100)

// Montants rapides : compte juste + billets usuels au-dessus du total
const quickAmounts = computed(() => {
  const total = order.value?.total || 0
  const notes = [5, 10, 20, 50].filter(n => n >= total).slice(0, 4)
  return [{ label: 'Juste', value: total }, ...notes.map(n => ({ label: `${n} €`, value: n }))].slice(0, 5)
})

onMounted(async () => {
  const last = JSON.parse(sessionStorage.getItem('lastOrder') || 'null')
  const { orderId, pending } = route.query

  if (pending) {
    order.value = last?.clientId === pending ? last : null
  } else if (last && String(last.orderId) === String(orderId)) {
    order.value = last
  } else if (orderId) {
    try {
      order.value = await org.orgApi(`/orders/${orderId}`)
    } catch (err) {
      if (err.status !== 401) ui.error(err.message)
    }
  }
  loading.value = false
})

async function cancelOrder() {
  const ok = await ui.confirm({
    title: 'Annuler la commande ?',
    message: 'La commande restera visible dans l’historique avec le statut « annulée ».',
    confirmLabel: 'Annuler la commande',
    cancelLabel: 'Retour',
    danger: true,
  })
  if (!ok) return

  if (order.value.pending) {
    removePending(orgSlug, order.value.clientId)
    sessionStorage.removeItem('lastOrder')
    ui.success('Commande hors-ligne supprimée.')
    return router.push(`/${orgSlug}/`)
  }

  try {
    await org.orgApi(`/orders/${order.value.orderId}`, { method: 'DELETE' })
    sessionStorage.removeItem('lastOrder')
    ui.success('Commande annulée.')
    router.push(`/${orgSlug}/`)
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}
</script>
