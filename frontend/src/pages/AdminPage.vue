<template>
  <div class="max-w-md mx-auto p-4">
    <h1 class="text-xl font-bold mb-4">🛠️ Admin - Produits</h1>

    <div
      v-for="product in products"
      :key="product.id"
      class="flex justify-between items-center border p-2 mb-2 rounded"
    >
      <div>
        <strong>{{ product.name }}</strong> - €{{ product.price.toFixed(2) }}
        <span class="italic text-gray-600" v-if="product.category_name">
          ({{ product.category_name }})
        </span>
      </div>
      <div class="space-x-2">
        <button @click="edit(product)" class="bg-yellow-300 px-2 rounded">🖊️</button>
        <button @click="del(product.id)" class="bg-red-300 px-2 rounded">🗑️</button>
      </div>
    </div>

    <form @submit.prevent="save" class="mt-4 space-y-2">
      <input v-model="form.name" placeholder="Nom" class="w-full p-2 border rounded" required />
      <input
        v-model.number="form.price"
        placeholder="Prix (€)"
        type="number"
        step="0.01"
        class="w-full p-2 border rounded"
        required
      />
      <select v-model="form.category_id" class="w-full p-2 border rounded">
        <option :value="null">-- Choisir une catégorie --</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>

      <button class="w-full bg-green-500 text-white p-2 rounded">💾 Enregistrer</button>
      <button
        v-if="form.id"
        @click="reset"
        type="button"
        class="w-full bg-gray-400 text-white p-2 rounded"
      >
        ✖️ Annuler
      </button>
    </form>
    
    <router-link to="/categories" class="block text-center mt-4 text-sm text-gray-500">📂 Categories</router-link>
    <router-link to="/summary/daily" class="block text-center mt-4 text-sm text-gray-500">💰 Total des ventes</router-link>
    <router-link to="/" class="block text-center mt-4 text-sm text-gray-500">⬅ Retour</router-link>
    <button
      @click="confirmDeleteOrders"
      class="mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
    >
      Supprimer toutes les commandes
    </button>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';

const products = ref([]);
const categories = ref([]);

const form = reactive({
  id: null,
  name: '',
  price: 0,
  category_id: null,
});

function reset() {
  Object.assign(form, { id: null, name: '', price: 0, category_id: null });
}

function edit(p) {
  // Remplit le formulaire avec le produit sélectionné
  Object.assign(form, {
    id: p.id,
    name: p.name,
    price: p.price,
    category_id: p.category_id || null,
  });
}

async function del(id) {
  await fetch(`http://localhost:3001/products/${id}`, { method: 'DELETE' });
  await loadProducts();
}

async function save() {
  const method = form.id ? 'PUT' : 'POST';
  const url = form.id ? `http://localhost:3001/products/${form.id}` : 'http://localhost:3001/products';

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });

  reset();
  await loadProducts();
}

async function loadProducts() {
  const res = await fetch('http://localhost:3001/products');
  products.value = await res.json();
}

async function loadCategories() {
  const res = await fetch('http://localhost:3001/categories');
  categories.value = await res.json();
}

onMounted(async () => {
  await Promise.all([loadProducts(), loadCategories()]);
});

async function deleteAllOrders() {
  const res = await fetch('http://localhost:3001/orders', { method: 'DELETE' });
  if (res.ok) {
    alert('Toutes les commandes ont été supprimées.');
  } else {
    const data = await res.json();
    alert('Erreur : ' + (data.error || 'Impossible de supprimer les commandes.'));
  }
}

function confirmDeleteOrders() {
  if (confirm('Es-tu sûr de vouloir supprimer **toutes** les commandes ? Cette action est irréversible.')) {
    deleteAllOrders();
  }
}
</script>
