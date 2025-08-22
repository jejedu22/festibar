<template>
  <div class="relative max-w-md mx-auto p-4">
    <!-- Bouton de déconnexion positionné absolument dans ce conteneur -->
    <button
      @click="logout"
      class="absolute top-4 right-4 text-sm text-red-600 hover:underline"
    >
      🔓 Déconnexion
    </button>
    <h1 class="text-xl font-bold mb-4">{{ orgStore.organizationName }}</h1>
    <h2 class="text-xl font-bold mb-4">🛠️ Admin - Produits</h2>
    <router-link :to="`/${orgSlug}/categories`" class="block text-center mt-4 text-sm text-gray-500">📂 Categories</router-link>
    <router-link :to="`/${orgSlug}/summary/daily`" class="block text-center mt-4 text-sm text-gray-500">💰 Total des ventes</router-link>
    <router-link :to="`/${orgSlug}/`" class="block text-center mt-4 text-sm text-gray-500">⬅ Retour</router-link>

    <form @submit.prevent="save" class="mt-4 space-y-2">
      <input 
        v-model="form.name" 
        ref="nameInput"
        placeholder="Nom" 
        class="w-full p-2 border rounded" 
        required 
      />
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

      <label class="flex items-center space-x-2">
        <input type="checkbox" v-model="form.available" />
        <span>Disponible</span>
      </label>

      <button class="w-full bg-green-500 text-white p-2 rounded">
        {{ form.id ? '💾 Enregistré' : '➕ Ajouter' }}
      </button>
      <button
        v-if="form.id"
        @click="reset"
        type="button"
        class="w-full bg-gray-400 text-white p-2 rounded"
      >
        ✖️ Annuler
      </button>
    </form>
    <div class="mt-8">
      <div
        v-for="product in products"
        :key="product.id"
        class="flex justify-between items-center border p-2 mb-2 rounded"
        :class="{ 'opacity-50 line-through': product.available === 0 }"
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
    </div>
    <button
      @click="confirmDeleteOrders"
      class="w-full mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
    >
      Supprimer toutes les commandes
    </button>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useOrganizationStore } from '@/stores/organization'

const route = useRoute();
const router = useRouter();
const orgSlug = route.params.orgSlug;
const orgStore = useOrganizationStore()

const nameInput = ref(null);
const products = ref([]);
const categories = ref([]);
const form = reactive({
  id: null,
  name: '',
  price: 0,
  category_id: null,
  available: true,
});

function reset() {
  Object.assign(form, { id: null, name: '', price: 0, category_id: null, available: true });
}

function edit(p) {
  Object.assign(form, {
    id: p.id,
    name: p.name,
    price: p.price,
    category_id: p.category_id || null,
    available: !!p.available,
  });
  nextTick(() => {
    nameInput.value?.focus();
  });
}

async function del(id) {
  await fetch(`/api/${orgSlug}/products/${id}`, { method: 'DELETE' });
  await loadProducts();
}

async function save() {
  const method = form.id ? 'PUT' : 'POST';
  const url = form.id ? `/api/${orgSlug}/products/${form.id}` : `/api/${orgSlug}/products`;

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });

  reset();
  await loadProducts();
}

async function loadProducts() {
  const res = await fetch(`/api/${orgSlug}/products`);
  products.value = await res.json();
}

async function loadCategories() {
  const res = await fetch(`/api/${orgSlug}/categories`);
  categories.value = await res.json();
}

onMounted(async () => {
  await Promise.all([loadProducts(), loadCategories()]);
});

async function deleteAllOrders() {
  const res = await fetch(`/api/${orgSlug}/orders`, { method: 'DELETE' });
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

function logout() {
  localStorage.removeItem('auth');
  router.push(`/${orgSlug}/`);
}
</script>
