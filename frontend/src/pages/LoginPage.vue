<template>
  <div class="max-w-xs mx-auto mt-24 p-4 border rounded shadow">
    <h1 class="text-xl font-bold mb-4 text-center">🔐 Connexion</h1>
    <form @submit.prevent="login" class="space-y-3">
      <input v-model="password" type="password" placeholder="Mot de passe" class="w-full border p-2 rounded" />
      <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded">Se connecter</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const password = ref('');
const router = useRouter();

function login() {
  console.log('Tentative de login...');
  if (password.value === 'admin123') {
    localStorage.setItem('auth', 'true');
    router.push('/admin');
  } else {
    alert('Mot de passe incorrect');
  }
}
</script>
