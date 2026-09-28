<!-- frontend/src/pages/AdminOrdersPage.vue -->
<template>
  <div class="max-w-3xl mx-auto p-4">
    <ManagerNav />
    <h1 class="text-2xl font-bold mb-4">Commandes</h1>

    <p v-if="loading" class="text-gray-600">Chargement…</p>
    <p v-else-if="!days.length" class="text-gray-600">Aucune commande.</p>

    <section v-for="day in days" :key="day" class="mb-8">
      <h2 class="text-lg font-bold mb-2 first-letter:uppercase">{{ formatDay(day) }}</h2>
      <article
        v-for="order in ordersByDay[day]"
        :key="order.orderId"
        class="border rounded-lg p-3 mb-2"
        :class="{ 'bg-gray-100 text-gray-600': order.status === 'cancelled' }"
      >
        <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
          <span class="font-semibold">
            n° {{ order.orderId }} · {{ formatTime(order.timestamp) }} · {{ paymentLabel(order.paymentMethod) }}
            <span v-if="order.status === 'cancelled'" class="ml-1 px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs">Annulée</span>
          </span>
          <span class="font-bold" :class="{ 'line-through': order.status === 'cancelled' }">{{ formatPrice(order.total) }}</span>
        </div>

        <table class="w-full text-sm">
          <thead class="sr-only">
            <tr><th>Produit</th><th>Quantité</th><th>Montant</th><th>Action</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in order.items" :key="item.productId" class="border-t">
              <td class="py-1">{{ item.productName }}</td>
              <td class="py-1 text-right">× {{ item.quantity }}</td>
              <td class="py-1 text-right w-24">{{ formatPrice(item.price * item.quantity) }}</td>
              <td class="py-1 text-right w-10">
                <button
                  v-if="order.status !== 'cancelled' && order.items.length > 1"
                  type="button"
                  class="text-red-700"
                  :aria-label="`Retirer ${item.productName} de la commande ${order.orderId}`"
                  @click="removeItem(order, item)"
                >✕</button>
              </td>
            </tr>
          </tbody>
        </table>

        <button
          v-if="order.status !== 'cancelled'"
          type="button"
          class="mt-2 w-full border border-red-600 text-red-700 py-1 rounded"
          @click="cancelOrder(order)"
        >Annuler la commande</button>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { formatPrice, formatDay, formatTime, paymentLabel } from '@/utils/format'
import ManagerNav from '@/components/ManagerNav.vue'

const org = useOrganizationStore()
const ui = useUiStore()

const ordersByDay = ref({})
const loading = ref(true)
const days = computed(() => Object.keys(ordersByDay.value).sort().reverse())

async function loadOrders() {
  try {
    ordersByDay.value = await org.orgApi('/orders/all')
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    loading.value = false
  }
}

async function removeItem(order, item) {
  const ok = await ui.confirm({
    title: 'Retirer cette ligne ?',
    message: `${item.quantity} × ${item.productName} (commande n° ${order.orderId}).\nL’opération est enregistrée dans le journal.`,
    confirmLabel: 'Retirer',
    danger: true,
  })
  if (!ok) return
  try {
    await org.orgApi(`/orders/${order.orderId}/items/${item.productId}`, { method: 'DELETE' })
    loadOrders()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

async function cancelOrder(order) {
  const ok = await ui.confirm({
    title: `Annuler la commande n° ${order.orderId} ?`,
    message: 'Elle restera visible avec le statut « annulée » et ne comptera plus dans les ventes.',
    confirmLabel: 'Annuler la commande',
    cancelLabel: 'Retour',
    danger: true,
  })
  if (!ok) return
  try {
    await org.orgApi(`/orders/${order.orderId}`, { method: 'DELETE' })
    ui.success('Commande annulée.')
    loadOrders()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

onMounted(loadOrders)
</script>
