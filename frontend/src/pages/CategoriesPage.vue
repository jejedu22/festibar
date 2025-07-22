<template>
  <div class="max-w-md mx-auto p-4">
    <h1 class="text-xl font-bold mb-4">📂 Catégories</h1>
    
    <div v-for="category in categories" :key="category.id" class="flex justify-between items-center border p-2 mb-2 rounded">
      <div>{{ category.name }}</div>
      <button @click="del(category.id)" class="bg-red-400 px-3 py-1 rounded text-white">🗑️ Supprimer</button>
    </div>
    
    <form @submit.prevent="save" class="mt-4 space-y-2">
      <input v-model="form.name" placeholder="Nom de la catégorie" class="w-full p-2 border rounded" required />
      <button class="w-full bg-green-500 text-white p-2 rounded">💾 Ajouter</button>
    </form>
    
    <router-link to="/admin" class="block text-center mt-4 text-sm text-gray-500">⬅ Retour</router-link>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';

const categories = ref([]);
const form = reactive({ name: '' });

async function load() {
  const res = await fetch('http://localhost:3001/categories');
  categories.value = await res.json();
}

async function save() {
  await fetch('http://localhost:3001/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  });
  form.name = '';
  load();
}

async function del(id) {
  if (!confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return;
  
  const res = await fetch(`http://localhost:3001/categories/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    alert(data.error || "Erreur lors de la suppression.");
  } else {
    load();
  }
}

onMounted(load);
</script>
