<template>
  <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">📅 Résumé des ventes jour par jour</h1>

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

    <router-link to="/admin" class="block mt-6 text-blue-600 hover:underline">
      ⬅ Retour à l'administration
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const dailySummary = ref([]);

onMounted(async () => {
  const res = await fetch('/api/summary/daily');
  dailySummary.value = await res.json();
});
</script>
