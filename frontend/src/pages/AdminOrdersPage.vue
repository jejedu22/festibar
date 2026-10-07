<!-- frontend/src/pages/AdminOrdersPage.vue : commandes par journée (annulation, retrait d'une ligne) -->
<template>
  <ManagerShell>
    <div class="space-y-4 lg:space-y-5">
      <h1 class="font-display font-bold text-[26px] lg:text-[32px] tracking-tight">Commandes</h1>

      <p v-if="loading" class="text-slate-600">Chargement…</p>
      <p v-else-if="!days.length" class="card p-8 text-center text-slate-600">Aucune commande pour le moment.</p>

      <template v-else>
        <!-- Journées -->
        <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="tablist" aria-label="Journée">
          <button
            v-for="day in days"
            :key="day"
            type="button"
            role="tab"
            :aria-selected="day === currentDay"
            class="chip"
            :class="day === currentDay ? 'bg-ink border-ink text-white' : 'bg-white border-slate-400 text-slate-800'"
            @click="selectedDay = day"
          ><span class="first-letter:uppercase">{{ formatShortDay(day) }}</span></button>
        </div>

        <!-- Filtre -->
        <div class="flex gap-2">
          <button
            v-for="f in filters"
            :key="f.value"
            type="button"
            :aria-pressed="filter === f.value"
            class="btn min-h-[40px] px-3.5 text-sm border"
            :class="filter === f.value ? 'bg-blue-50 border-blue-800 text-blue-800' : 'bg-white border-slate-300 text-slate-700 font-medium'"
            @click="filter = f.value"
          >{{ f.label }} · {{ f.count }}</button>
        </div>

        <p v-if="!visibleOrders.length" class="card p-6 text-center text-slate-600">Aucune commande annulée ce jour-là.</p>

        <ul class="space-y-2.5">
          <li
            v-for="order in visibleOrders"
            :key="order.orderId"
            class="rounded-[14px] border overflow-hidden"
            :class="[
              order.status === 'cancelled' ? 'bg-slate-100 border-slate-200' : 'bg-white',
              isOpen(order) ? 'border-slate-400' : 'border-slate-200',
            ]"
          >
            <button
              type="button"
              class="w-full min-h-[64px] px-4 py-2.5 flex items-center gap-3 text-left"
              :aria-expanded="isOpen(order)"
              @click="toggle(order)"
            >
              <span class="flex-1 min-w-0">
                <span class="block font-semibold" :class="{ 'text-slate-500': order.status === 'cancelled' }">n° {{ order.orderId }} · {{ formatTime(order.timestamp) }}</span>
                <span class="block text-[13px] text-slate-600">{{ paymentLabel(order.paymentMethod) }} · {{ itemCount(order) }} article{{ itemCount(order) > 1 ? 's' : '' }}</span>
              </span>
              <span v-if="order.status === 'cancelled'" class="px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 text-xs font-semibold">Annulée</span>
              <span class="font-bold text-[17px]" :class="{ 'line-through text-slate-500': order.status === 'cancelled' }">{{ formatPrice(order.total) }}</span>
              <Icon :name="isOpen(order) ? 'chevronUp' : 'chevronDown'" :size="18" :stroke="2.2" class="text-slate-600" />
            </button>

            <div v-if="isOpen(order)" class="px-4 pb-4">
              <table class="w-full text-[15px] border-t border-slate-100">
                <thead class="sr-only">
                  <tr><th>Produit</th><th>Montant</th><th>Action</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in order.items" :key="item.productId" class="border-b border-slate-100 last:border-b-0">
                    <td class="py-2.5">{{ item.productName }} <span class="text-slate-600">× {{ item.quantity }}</span></td>
                    <td class="py-2.5 text-right font-medium w-24">{{ formatPrice(item.price * item.quantity) }}</td>
                    <td class="w-11 text-right">
                      <button
                        v-if="order.status !== 'cancelled' && order.items.length > 1"
                        type="button"
                        class="w-11 h-11 inline-flex items-center justify-center text-red-700 rounded-lg hover:bg-red-50"
                        :aria-label="`Retirer ${item.productName} de la commande ${order.orderId}`"
                        @click="removeItem(order, item)"
                      ><Icon name="close" :size="18" :stroke="2.2" /></button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button v-if="order.status !== 'cancelled'" type="button" class="btn-danger w-full min-h-[48px] mt-2.5" @click="cancelOrder(order)">
                Annuler la commande
              </button>
            </div>
          </li>
        </ul>
      </template>
    </div>
  </ManagerShell>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { formatPrice, formatShortDay, formatTime, paymentLabel } from '@/utils/format'
import ManagerShell from '@/components/ManagerShell.vue'
import Icon from '@/components/Icon.vue'

const org = useOrganizationStore()
const ui = useUiStore()

const ordersByDay = ref({})
const loading = ref(true)
const selectedDay = ref(null)
const filter = ref('all')
const opened = reactive(new Set())

const days = computed(() => Object.keys(ordersByDay.value).sort().reverse())
const currentDay = computed(() => (days.value.includes(selectedDay.value) ? selectedDay.value : days.value[0]))
const dayOrders = computed(() => ordersByDay.value[currentDay.value] || [])
const filters = computed(() => [
  { value: 'all', label: 'Toutes', count: dayOrders.value.length },
  { value: 'cancelled', label: 'Annulées', count: dayOrders.value.filter(o => o.status === 'cancelled').length },
])
const visibleOrders = computed(() =>
  filter.value === 'cancelled' ? dayOrders.value.filter(o => o.status === 'cancelled') : dayOrders.value
)

const itemCount = order => order.items.reduce((n, i) => n + i.quantity, 0)
const isOpen = order => opened.has(order.orderId)
function toggle(order) {
  if (opened.has(order.orderId)) opened.delete(order.orderId)
  else opened.add(order.orderId)
}

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
