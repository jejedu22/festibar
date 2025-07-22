<!-- frontend/src/views/Admin.vue -->
<template>
  <div>
    <h1>Admin - Produits</h1>
    <form @submit.prevent="addProduct">
      <input v-model="newProduct.name" placeholder="Nom du produit" required />
      <input v-model.number="newProduct.price" placeholder="Prix (€)" type="number" required />
      <button type="submit">Ajouter</button>
    </form>

    <ul>
      <li v-for="p in products" :key="p.id">
        {{ p.name }} (€{{ p.price.toFixed(2) }})
        <button @click="deleteProduct(p.id)">🗑 Supprimer</button>
      </li>
    </ul>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const products = ref([]);
    const newProduct = ref({ name: '', price: 0 });

    const fetchProducts = async () => {
      const res = await fetch('http://localhost:3001/products');
      products.value = await res.json();
    };

    const addProduct = async () => {
      await fetch('http://localhost:3001/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct.value)
      });
      newProduct.value = { name: '', price: 0 };
      fetchProducts();
    };

    const deleteProduct = async (id) => {
      await fetch(`http://localhost:3001/products/${id}`, {
        method: 'DELETE'
      });
      fetchProducts();
    };

    onMounted(fetchProducts);

    return { products, newProduct, addProduct, deleteProduct };
  }
};
</script>
