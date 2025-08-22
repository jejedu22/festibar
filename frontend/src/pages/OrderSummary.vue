<template>
  <div class="max-w-md mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">{{ orgStore.organizationName }}</h1>
    <h2 class="text-2xl font-bold mb-4">🧾 Récapitulatif de la commande</h2>

    <div v-if="items.length">
      <div v-for="(item, index) in items" :key="index" class="flex justify-between border-b py-2">
        <span>{{ item.name }} (x{{ item.quantity }})</span>
        <span>€{{ (item.price * item.quantity).toFixed(2) }}</span>
      </div>
      <div class="mt-4 text-lg font-bold">Total : €{{ total.toFixed(2) }}</div>
    </div>
    <div v-else class="text-gray-500">Chargement du récapitulatif...</div>

    <router-link :to="`/${orgSlug}/`" class="block mt-6 w-full bg-green-500 text-white text-center py-2 rounded">
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
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useOrganizationStore } from '@/stores/organization'

const route = useRoute();
const router = useRouter();
const orgSlug = route.params.orgSlug;
const orgStore = useOrganizationStore()

const items = ref([]);
const total = ref(0);

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
