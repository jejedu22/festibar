<!-- frontend/src/pages/DailySalesSummaryPage.vue -->
<template>
  <div class="max-w-3xl mx-auto p-4">
    <ManagerNav />
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h1 class="text-2xl font-bold">Ventes par journée</h1>
      <button type="button" class="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" :disabled="exporting" @click="exportOrders">
        {{ exporting ? 'Export…' : '⬇️ Exporter (Excel)' }}
      </button>
    </div>
    <p class="text-sm text-gray-700 mb-4">
      Une journée va de {{ dayStart }} h à {{ dayStart }} h le lendemain : les ventes après minuit comptent pour la soirée.
      Les commandes annulées sont exclues des totaux.
    </p>

    <p v-if="loading" class="text-gray-600">Chargement…</p>
    <p v-else-if="!summary.length" class="text-gray-600">Aucune vente.</p>

    <section v-for="d in summary" :key="d.day" class="mb-10">
      <h2 class="text-xl font-semibold mb-2 border-b pb-1 first-letter:uppercase">{{ formatDay(d.day) }}</h2>

      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div class="bg-gray-50 rounded p-2"><dt class="text-xs text-gray-600">Total</dt><dd class="text-lg font-bold">{{ formatPrice(d.total) }}</dd></div>
        <div class="bg-gray-50 rounded p-2"><dt class="text-xs text-gray-600">Commandes</dt><dd class="text-lg font-bold">{{ d.orderCount }}</dd></div>
        <div v-for="m in PAYMENT_METHODS" :key="m.value" v-show="d.byPaymentMethod[m.value]" class="bg-gray-50 rounded p-2">
          <dt class="text-xs text-gray-600">{{ m.icon }} {{ m.label }}</dt><dd class="text-lg font-bold">{{ formatPrice(d.byPaymentMethod[m.value]) }}</dd>
        </div>
        <div v-if="d.cancelledCount" class="bg-red-50 rounded p-2"><dt class="text-xs text-gray-600">Annulées</dt><dd class="text-lg font-bold">{{ d.cancelledCount }}</dd></div>
      </dl>

      <div class="overflow-x-auto">
        <table class="w-full text-left border border-collapse text-sm">
          <thead>
            <tr class="bg-gray-200">
              <th scope="col" class="border px-2 py-1">Produit</th>
              <th scope="col" class="border px-2 py-1 text-right">Qté</th>
              <th scope="col" class="border px-2 py-1 text-right">Prix unitaire</th>
              <th scope="col" class="border px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in d.products" :key="`${p.id}-${p.price}`">
              <td class="border px-2 py-1">{{ p.name }}</td>
              <td class="border px-2 py-1 text-right">{{ p.total_quantity }}</td>
              <td class="border px-2 py-1 text-right">{{ formatPrice(p.price) }}</td>
              <td class="border px-2 py-1 text-right">{{ formatPrice(p.total_amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Zone dangereuse -->
    <section class="mt-12 border-2 border-red-300 rounded-xl p-4" aria-labelledby="danger-title">
      <h2 id="danger-title" class="font-bold text-red-800">Zone dangereuse</h2>
      <p class="text-sm text-gray-700 my-2">
        Supprime définitivement toutes les commandes (par exemple avant un nouvel événement).
        Exportez-les d’abord : cette action est irréversible.
      </p>
      <button type="button" class="bg-red-600 text-white px-4 py-2 rounded" @click="deleteAllOrders">
        Supprimer toutes les commandes
      </button>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { formatPrice, formatDay, PAYMENT_METHODS } from '@/utils/format'
import { api } from '@/utils/api'
import ManagerNav from '@/components/ManagerNav.vue'

const route = useRoute()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()
const ui = useUiStore()

const summary = ref([])
const loading = ref(true)
const exporting = ref(false)
const dayStart = ref(6)

async function load() {
  try {
    summary.value = await org.orgApi('/summary/daily')
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  } finally {
    loading.value = false
  }
}

// Téléchargement authentifié (le jeton ne peut pas passer par un simple lien)
async function exportOrders() {
  exporting.value = true
  try {
    const res = await org.orgApi('/summary/daily/export', { raw: true, timeout: 60000 })
    const url = URL.createObjectURL(await res.blob())
    const a = Object.assign(document.createElement('a'), { href: url, download: `commandes-${orgSlug}.xlsx` })
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
    return false
  } finally {
    exporting.value = false
  }
}

async function deleteAllOrders() {
  const wantsExport = await ui.confirm({
    title: 'Exporter avant de supprimer ?',
    message: 'Il est fortement conseillé de télécharger l’export Excel avant la suppression.',
    confirmLabel: 'Exporter',
    cancelLabel: 'Continuer sans exporter',
  })
  if (wantsExport && !(await exportOrders())) return

  const ok = await ui.confirm({
    title: 'Supprimer toutes les commandes ?',
    message: 'Toutes les commandes et statistiques de cette organisation seront définitivement effacées.',
    confirmLabel: 'Tout supprimer',
    danger: true,
    requireText: orgSlug,
  })
  if (!ok) return

  try {
    const res = await org.orgApi('/orders', { method: 'DELETE', body: { confirm: orgSlug } })
    ui.success(`${res.deleted} commande(s) supprimée(s).`)
    load()
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}

onMounted(() => {
  load()
  api('/api/config').then(c => (dayStart.value = c.serviceDayStartHour)).catch(() => {})
})
</script>
