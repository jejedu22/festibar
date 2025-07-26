<template>
  <div class="max-w-2xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">📊 Résumé des ventes du jour</h1>

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
        <tr v-for="product in summary.products" :key="product.id">
          <td class="border px-2 py-1">{{ product.name }}</td>
          <td class="border px-2 py-1">{{ product.total_quantity }}</td>
          <td class="border px-2 py-1">€{{ product.price.toFixed(2) }}</td>
          <td class="border px-2 py-1">€{{ product.total_amount.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="mt-4 text-right text-xl font-semibold">
      Total global : €{{ summary.total.toFixed(2) }}
    </div>

    <router-link to="/admin" class="block mt-6 text-blue-600 hover:underline">
      ⬅ Retour à l'administration
    </router-link>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const summary = ref({ products: [], total: 0 });

onMounted(async () => {
  const res = await fetch('/api/summary/today');
  summary.value = await res.json();
});
</script>
