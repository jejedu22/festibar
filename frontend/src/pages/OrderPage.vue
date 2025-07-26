<template>
  <div class="max-w-md mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">🎪 Commande Bar Festival</h1>
    <div class="mt-4 text-lg">Total: €{{ total.toFixed(2) }}</div>
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
          class="mb-1 border p-2 min-h-20 rounded-xl shadow flex items-center justify-between"
          :class="{ 'opacity-50 pointer-events-none': !product.available }"
        >
          <div>
            <div class="font-medium">
              {{ product.name }}
              <span v-if="!product.available" class="text-sm text-red-500 ml-2">[Y'a plus, c'est fini !]</span>
            </div>
            <div v-if="product.available" class="text-sm text-gray-600">€{{ product.price.toFixed(2) }}</div>
          </div>
          <div v-if="product.available" class="flex items-center gap-1">
            <!-- Bouton "-" -->
            <button
              @click="changeQuantity(product.id, -1)"
              class="bg-red-200 w-20 min-w-[5rem] min-h-[5rem] flex items-center justify-center rounded-lg"
            >
              <svg class="w-15 h-15 text-red-800" fill="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="11" width="16" height="2" rx="1" />
              </svg>
            </button>

            <span class="text-2xl px-4 min-w-[2.5rem] text-center">{{ cart[product.id] || 0 }}</span>
            
            <!-- Bouton "+" -->
            <button
              @click="changeQuantity(product.id, 1)"
              class="bg-green-200 w-20 min-w-[5rem] min-h-[5rem] flex items-center justify-center rounded-lg"
            >
              <svg class="w-15 h-15 text-green-800" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 4a1 1 0 0 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V4z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>


<button
  @click="submitOrder"
  style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
  class="min-h-[5rem] mt-4 w-full bg-blue-500 text-white text-lg font-semibold py-3 px-6 rounded-lg hover:bg-blue-600 transition text-center truncate"
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

  const res = await fetch('/api/orders', {
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
    fetch('/api/products'),
    fetch('/api/categories'),
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
