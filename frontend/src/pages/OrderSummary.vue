<!-- frontend/src/pages/OrderSummary.vue -->
<template>
  <div class="max-w-md mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">{{ orgStore.organizationName }}</h1>
    <h2 class="text-2xl font-bold mb-4">🧾 Récapitulatif de la commande</h2>

    <div v-if="items.length">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="flex justify-between border-b py-2"
      >
        <span>{{ item.name }} (x{{ item.quantity }})</span>
        <span>€{{ (item.price * item.quantity).toFixed(2) }}</span>
      </div>

      <div class="mt-4 text-lg font-bold">
        Total : €{{ total.toFixed(2) }}
      </div>

      <!-- Champ Argent reçu -->
      <div class="mt-4">
        <label for="received" class="block text-sm font-medium mb-1">💶 Argent reçu</label>
        <input
          id="received"
          type="number"
          v-model.number="received"
          class="w-full border rounded px-3 py-2 text-lg"
          min="0"
          step="0.01"
        />
      </div>

      <!-- Différence -->
      <div v-if="received !== null" class="mt-2 text-lg">
        <span v-if="difference > 0" class="text-green-600 font-bold">
          Rendu au client : €{{ difference.toFixed(2) }}
        </span>
        <span v-else-if="difference < 0" class="text-red-600 font-bold">
          Il manque : €{{ Math.abs(difference).toFixed(2) }}
        </span>
        <span v-else class="text-gray-600 font-bold">
          Paiement exact reçu ✅
        </span>
      </div>
    </div>

    <div v-else class="text-gray-500">Chargement du récapitulatif...</div>

    <router-link
      :to="`/${orgSlug}/`"
      class="block mt-6 w-full bg-green-500 text-white text-center py-2 rounded"
    >
      ➕ Nouvelle commande
    </router-link>

    <button
      @click="cancelOrder"
      class="mt-4 w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition"
    >
      ❌ Annuler la commande
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useOrganizationStore } from '@/stores/organization';

const route = useRoute();
const router = useRouter();
const orgSlug = route.params.orgSlug;
const orgStore = useOrganizationStore();

const items = ref([]);
const total = ref(0);
const received = ref(null); // argent reçu

// Différence calculée
const difference = computed(() => {
  if (received.value === null) return 0;
  return received.value - total.value;
});

onMounted(async () => {
  const orderId = route.query.orderId;
  if (!orderId) return;

  const res = await fetch(`/api/${orgSlug}/orders/${orderId}`);
  const data = await res.json();
  items.value = data.items;
  total.value = data.total;
});

async function cancelOrder() {
  const orderId = route.query.orderId;
  if (!orderId) return;

  const confirmCancel = confirm('Es-tu sûr de vouloir annuler cette commande ?');
  if (!confirmCancel) return;

  const res = await fetch(`/api/${orgSlug}/orders/${orderId}`, {
    method: 'DELETE',
  });

  if (res.ok) {
    alert('Commande annulée.');
    router.push(`/${orgSlug}/`);
  } else {
    const err = await res.json();
    alert('Erreur : ' + (err.error || 'Impossible d’annuler la commande.'));
  }
}
</script>
