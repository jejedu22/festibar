<template>
  <div class="max-w-md mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">🎪 Commande Bar Festival</h1>

    <div
      v-for="category in categoriesWithProducts"
      :key="category.id"
      class="mb-6"
    >
      <button
        @click="toggleCategory(category.id)"
        class="w-full text-left text-xl font-semibold mb-2 border-b pb-1 flex justify-between items-center"
      >
        {{ category.name }}
        <span class="text-lg">{{ expanded[category.id] ? '➖' : '➕' }}</span>
      </button>

      <div v-if="expanded[category.id]">
        <div
          v-for="product in category.products"
          :key="product.id"
          class="mb-2 border p-2 rounded-lg shadow flex items-center justify-between"
        >
          <div>
            <div class="font-medium">{{ product.name }}</div>
            <div class="text-sm text-gray-600">€{{ product.price.toFixed(2) }}</div>
          </div>
          <div class="flex items-center">
            <button
              @click="changeQuantity(product.id, -1)"
              class="bg-red-200 text-4xl w-14 h-14 flex items-center justify-center rounded-xl"
            >
              -
            </button>
            <span class="px-6 text-xl">{{ cart[product.id] || 0 }}</span>
            <button
              @click="changeQuantity(product.id, 1)"
              class="bg-green-200 text-4xl w-14 h-14 flex items-center justify-center rounded-xl"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 text-lg">Total: €{{ total.toFixed(2) }}</div>
    <button
      @click="submitOrder"
      class="mt-2 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
    >
      Valider la commande
    </button>
    <router-link to="/admin" class="block text-center mt-4 text-sm text-gray-500"
      >🔒 Admin</router-link
    >
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const products = ref([]);
const categories = ref([]);
const cart = reactive({});
const expanded = reactive({}); // ← état des catégories dépliées

const total = computed(() => {
  return products.value.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);
});

function changeQuantity(id, delta) {
  cart[id] = Math.max(0, (cart[id] || 0) + delta);
}

function toggleCategory(categoryId) {
  expanded[categoryId] = !expanded[categoryId];
}

// Construit un tableau avec catégories + produits
const categoriesWithProducts = computed(() => {
  return categories.value
    .map((cat) => ({
      ...cat,
      products: products.value
        .filter((p) => p.category_id === cat.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((cat) => cat.products.length > 0);
});

async function submitOrder() {
  const items = Object.entries(cart)
    .filter(([_, q]) => q > 0)
    .map(([productId, quantity]) => ({
      productId: parseInt(productId),
      quantity,
    }));

  const res = await fetch('http://localhost:3001/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  const data = await res.json();

  // Vider le panier
  Object.keys(cart).forEach((k) => (cart[k] = 0));

  // Redirection vers résumé
  router.push({ path: '/summary', query: { orderId: data.orderId } });
}

onMounted(async () => {
  const [productsRes, categoriesRes] = await Promise.all([
    fetch('http://localhost:3001/products'),
    fetch('http://localhost:3001/categories'),
  ]);
  products.value = await productsRes.json();
  categories.value = await categoriesRes.json();

  // Init des états repliés
  categories.value.forEach((cat) => {
    expanded[cat.id] = false;
  });
});
</script>

<style scoped>
button {
  min-width: 32px;
  height: 32px;
}
</style>
