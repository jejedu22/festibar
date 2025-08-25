<template>
  <div class="max-w-3xl mx-auto p-4">
    <!-- Titre + boutons alignés -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
      <!-- Titre -->
      <h1 class="text-2xl font-bold">{{ orgStore.organizationName }}</h1>

      <div class="flex flex-col md:flex-row gap-2 w-full md:w-auto">
        <!-- Bouton exporter -->
        <button
          @click="downloadDailySummary"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Exporter les commandes
        </button>

        <!-- Bouton supprimer toutes les commandes -->
        <button
          @click="confirmDeleteOrders"
          class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
        >
          Supprimer toutes les commandes
        </button>
      </div>
    </div>
    <h2 class="text-2xl font-bold mb-6">📅 Résumé des ventes jour par jour</h2>

    <div v-for="daySummary in dailySummary" :key="daySummary.day" class="mb-10">
      <h2 class="text-xl font-semibold mb-2 border-b pb-1">{{ daySummary.day }}</h2>

      <table class="w-full text-left border border-collapse">
        <thead>
          <tr class="bg-gray-200">
            <th class="border px-2 py-1">Produit</th>
            <th class="border px-2 py-1">Qté</th>
            <th class="border px-2 py-1">Prix unitaire</th>
            <th class="border px-2 py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in daySummary.products" :key="product.id">
            <td class="border px-2 py-1">{{ product.name }}</td>
            <td class="border px-2 py-1">{{ product.total_quantity }}</td>
            <td class="border px-2 py-1">€{{ product.price.toFixed(2) }}</td>
            <td class="border px-2 py-1">€{{ product.total_amount.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-2 text-right font-semibold">
        Total global : €{{ daySummary.total.toFixed(2) }}
      </div>
    </div>

    <router-link :to="`/${orgSlug}/admin`" class="block mt-6 text-blue-600 hover:underline">
      ⬅ Retour à l'administration
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useOrganizationStore } from '@/stores/organization'

const route = useRoute();
const orgSlug = route.params.orgSlug;
const orgStore = useOrganizationStore()

const dailySummary = ref([]);

function getAuthHeaders() {
  if (!orgStore.organization) return {}
  return {
    'Content-Type': 'application/json',
    'x-auth': JSON.stringify({
      id: orgStore.organization.id,
      slug: orgStore.organization.slug,
    }),
  }
}

function downloadDailySummary() {
  window.open(`/api/${orgSlug}/summary/daily/export`, '_blank');
}

// --- Gestion commandes ---
async function deleteAllOrders() {
  const res = await fetch(`/api/${orgSlug}/orders`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (res.ok) {
    alert('Toutes les commandes ont été supprimées.')
  } else {
    const data = await res.json()
    alert('Erreur : ' + (data.error || 'Impossible de supprimer les commandes.'))
  }
}

function confirmDeleteOrders() {
  if (confirm('Es-tu sûr de vouloir supprimer **toutes** les commandes ? Cette action est irréversible.')) {
    deleteAllOrders()
  }
}
onMounted(async () => {
  const res = await fetch(`/api/${orgSlug}/summary/daily`, { headers: getAuthHeaders() });
  dailySummary.value = await res.json();
});
</script>
