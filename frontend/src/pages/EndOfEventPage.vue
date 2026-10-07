<!-- frontend/src/pages/EndOfEventPage.vue : export final puis remise à zéro des commandes -->
<template>
  <ManagerShell>
    <div class="space-y-5 max-w-2xl">
      <div>
        <h1 class="font-display font-bold text-[26px] lg:text-[32px] tracking-tight">Fin d’événement</h1>
        <p class="text-sm text-slate-600 mt-0.5">Avant un nouvel événement : gardez une copie des ventes, puis repartez de zéro.</p>
      </div>

      <ol class="space-y-4">
        <li class="card p-5">
          <div class="flex items-start gap-4">
            <span class="w-9 h-9 rounded-full inline-flex items-center justify-center font-display font-bold shrink-0" :class="exported ? 'bg-green-100 text-green-900' : 'bg-blue-100 text-blue-900'">1</span>
            <div class="flex-1 min-w-0">
              <h2 class="font-semibold text-base">Exporter les commandes</h2>
              <p class="text-sm text-slate-600 mt-1 mb-3">Fichier Excel avec toutes les commandes (y compris annulées) et le journal des opérations.</p>
              <button type="button" class="btn-secondary min-h-[48px]" :disabled="exporting" @click="exportOrders">
                <Icon name="download" :size="19" />{{ exporting ? 'Export…' : exported ? 'Exporter à nouveau' : 'Exporter (Excel)' }}
              </button>
              <p v-if="exported" class="text-sm text-green-900 mt-2" role="status">Export téléchargé.</p>
            </div>
          </div>
        </li>

        <li class="p-5 rounded-2xl border border-red-200 bg-red-50">
          <div class="flex items-start gap-4">
            <span class="w-9 h-9 rounded-full inline-flex items-center justify-center font-display font-bold shrink-0 bg-red-100 text-red-900">2</span>
            <div class="flex-1 min-w-0">
              <h2 class="font-semibold text-base text-red-900">Supprimer toutes les commandes</h2>
              <p class="text-sm text-red-900 mt-1 mb-3">
                Efface définitivement les commandes et les statistiques de ventes. La carte (produits, catégories) est conservée.
                Il faudra recopier <span class="font-mono">{{ orgSlug }}</span> pour confirmer.
              </p>
              <button type="button" class="btn bg-red-700 text-white hover:bg-red-800 min-h-[48px]" @click="deleteAllOrders">
                <Icon name="trash" :size="19" />Supprimer toutes les commandes
              </button>
            </div>
          </div>
        </li>
      </ol>
    </div>
  </ManagerShell>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import { useUiStore } from '@/stores/ui'
import { downloadOrdersExport } from '@/utils/exportOrders'
import ManagerShell from '@/components/ManagerShell.vue'
import Icon from '@/components/Icon.vue'

const route = useRoute()
const orgSlug = route.params.orgSlug
const org = useOrganizationStore()
const ui = useUiStore()

const exporting = ref(false)
const exported = ref(false)

async function exportOrders() {
  exporting.value = true
  try {
    await downloadOrdersExport(org, orgSlug)
    exported.value = true
    return true
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
    return false
  } finally {
    exporting.value = false
  }
}

async function deleteAllOrders() {
  if (!exported.value) {
    const wantsExport = await ui.confirm({
      title: 'Exporter avant de supprimer ?',
      message: 'Il est fortement conseillé de télécharger l’export Excel avant la suppression.',
      confirmLabel: 'Exporter',
      cancelLabel: 'Continuer sans exporter',
    })
    if (wantsExport && !(await exportOrders())) return
  }

  const ok = await ui.confirm({
    title: 'Supprimer toutes les commandes ?',
    message: 'Toutes les commandes et statistiques de cette structure seront définitivement effacées.',
    confirmLabel: 'Tout supprimer',
    danger: true,
    requireText: orgSlug,
  })
  if (!ok) return

  try {
    const res = await org.orgApi('/orders', { method: 'DELETE', body: { confirm: orgSlug } })
    ui.success(`${res.deleted} commande(s) supprimée(s).`)
    exported.value = false
  } catch (err) {
    if (err.status !== 401) ui.error(err.message)
  }
}
</script>
