<!-- frontend/src/pages/DailySalesSummaryPage.vue : ventes par journée de service -->
<template>
  <ManagerShell>
    <div class="space-y-5 lg:space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-display font-bold text-[26px] lg:text-[32px] tracking-tight">Ventes</h1>
          <p class="text-sm text-slate-600 mt-0.5">Journée de service de {{ dayStart }} h à {{ dayStart }} h · commandes annulées exclues des totaux</p>
        </div>
        <button type="button" class="btn-secondary min-h-[48px]" :disabled="exporting" @click="exportOrders">
          <Icon name="download" :size="19" />{{ exporting ? 'Export…' : 'Exporter (Excel)' }}
        </button>
      </div>

      <p v-if="loading" class="text-slate-600">Chargement…</p>
      <p v-else-if="!summary.length" class="card p-8 text-center text-slate-600">Aucune vente pour le moment.</p>

      <template v-else>
        <!-- Choix de la journée -->
        <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="tablist" aria-label="Journée">
          <button
            v-for="d in summary"
            :key="d.day"
            type="button"
            role="tab"
            :aria-selected="d.day === current.day"
            class="chip"
            :class="d.day === current.day ? 'bg-ink border-ink text-white' : 'bg-white border-slate-400 text-slate-800'"
            @click="selectedDay = d.day"
          >
            <span class="first-letter:uppercase">{{ formatShortDay(d.day) }}</span>
            <span class="ml-2 font-normal opacity-90">{{ formatPrice(d.total) }}</span>
          </button>
        </div>

        <!-- Chiffres clés -->
        <dl class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div class="col-span-2 lg:col-span-1 rounded-2xl p-5 bg-blue-600 text-white">
            <dt class="text-[13px] font-medium">Total de la journée</dt>
            <dd class="font-display font-bold text-[36px] lg:text-[38px] tracking-tight mt-1 leading-none">{{ formatPrice(current.total) }}</dd>
          </div>
          <div class="card p-5">
            <dt class="text-[13px] text-slate-600">Commandes</dt>
            <dd class="font-display font-bold text-[28px] lg:text-[32px] mt-1 leading-none">{{ current.orderCount }}</dd>
          </div>
          <div class="card p-5">
            <dt class="text-[13px] text-slate-600">Panier moyen</dt>
            <dd class="font-display font-bold text-[28px] lg:text-[32px] mt-1 leading-none">{{ current.orderCount ? formatPrice(current.total / current.orderCount) : '—' }}</dd>
          </div>
          <div class="card p-5 col-span-2 lg:col-span-1">
            <dt class="text-[13px] text-slate-600">Annulées</dt>
            <dd class="font-display font-bold text-[28px] lg:text-[32px] mt-1 leading-none">{{ current.cancelledCount }}</dd>
          </div>
        </dl>

        <!-- Moyens de paiement -->
        <section v-if="current.total > 0" class="card px-5 lg:px-6 py-5" aria-labelledby="pay-title">
          <h2 id="pay-title" class="text-base font-semibold mb-4">Répartition par moyen de paiement</h2>
          <div class="flex gap-0.5 h-3.5 rounded-full overflow-hidden" role="img" :aria-label="payments.map(p => `${p.label} ${p.share} %`).join(', ')">
            <span v-for="p in payments.filter(p => p.amount > 0)" :key="p.value" :style="{ flexGrow: p.amount, background: p.color }" class="basis-0"></span>
          </div>
          <ul class="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-x-10 sm:gap-y-3 mt-4">
            <li v-for="p in payments" :key="p.value" class="flex items-center gap-2.5 text-sm">
              <span class="w-3 h-3 rounded-[3px] shrink-0" :style="{ background: p.color }" aria-hidden="true"></span>
              <span class="flex-1 sm:flex-none text-slate-700">{{ p.label }}</span>
              <span class="font-semibold text-[15px]">{{ formatPrice(p.amount) }}</span>
              <span class="w-10 sm:w-auto text-right text-[13px] text-slate-600">{{ p.share }} %</span>
            </li>
          </ul>
        </section>

        <!-- Produits vendus -->
        <section class="card px-5 lg:px-6 pt-5 pb-2" aria-labelledby="prod-title">
          <h2 id="prod-title" class="text-base font-semibold mb-2">Produits vendus</h2>
          <p v-if="!products.length" class="pb-4 text-slate-600 text-sm">Aucun produit vendu ce jour-là.</p>
          <ul>
            <li
              v-for="p in products"
              :key="`${p.id}-${p.price}`"
              class="py-3 border-t border-slate-100 sm:grid sm:grid-cols-[minmax(120px,200px)_minmax(0,1fr)_110px_110px] sm:items-center sm:gap-4"
            >
              <div class="flex items-baseline justify-between gap-2 sm:contents">
                <span class="font-medium">{{ p.name }}</span>
                <span class="font-semibold sm:hidden">{{ formatPrice(p.total_amount) }}</span>
              </div>
              <div class="flex items-center gap-2.5 mt-1.5 sm:mt-0 sm:contents">
                <span class="flex-1 block h-2.5 bg-slate-100 rounded-full" aria-hidden="true">
                  <span class="block h-2.5 rounded-full bg-[#2a78d6]" :style="{ width: `${(p.total_amount / maxAmount) * 100}%` }"></span>
                </span>
                <span class="text-[13px] text-slate-600 text-right w-[88px] sm:w-auto">{{ p.total_quantity }} × {{ formatPrice(p.price) }}</span>
              </div>
              <span class="hidden sm:block font-semibold text-right">{{ formatPrice(p.total_amount) }}</span>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </ManagerShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { formatPrice, formatShortDay, PAYMENT_METHODS } from '@/utils/format'
import { downloadOrdersExport } from '@/utils/exportOrders'
import { api } from '@/utils/api'
import ManagerShell from '@/components/ManagerShell.vue'
import Icon from '@/components/Icon.vue'

const route = useRoute()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()
const ui = useUiStore()

// Couleurs des moyens de paiement : palette catégorielle validée (daltonisme), toujours avec libellé
const PAYMENT_COLORS = { cash: '#2a78d6', card: '#eb6834', other: '#1baf7a' }

const summary = ref([])
const loading = ref(true)
const exporting = ref(false)
const dayStart = ref(6)
const selectedDay = ref(null)

const EMPTY_DAY = { day: '', total: 0, orderCount: 0, cancelledCount: 0, byPaymentMethod: {}, products: [] }
const current = computed(() => summary.value.find(d => d.day === selectedDay.value) || summary.value[0] || EMPTY_DAY)

const payments = computed(() =>
  PAYMENT_METHODS.map(m => {
    const amount = current.value.byPaymentMethod[m.value] || 0
    return {
      value: m.value,
      label: m.label,
      color: PAYMENT_COLORS[m.value],
      amount,
      share: current.value.total ? Math.round((amount / current.value.total) * 100) : 0,
    }
  })
)

const products = computed(() => [...current.value.products].sort((a, b) => b.total_amount - a.total_amount))
const maxAmount = computed(() => Math.max(1, ...products.value.map(p => p.total_amount)))

async function load() {
  try {
    summary.value = await org.orgApi('/summary/daily')
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    loading.value = false
  }
}

async function exportOrders() {
  exporting.value = true
  try {
    await downloadOrdersExport(org, orgSlug)
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  load()
  api('/api/config').then(c => (dayStart.value = c.serviceDayStartHour)).catch(() => {})
})
</script>
