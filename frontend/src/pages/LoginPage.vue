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

async function login() {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: password.value }),
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.error || 'Erreur de connexion');
      return;
    }

    const data = await response.json();
    localStorage.setItem('auth', 'true');
    router.push('/admin');
  } catch (err) {
    alert('Erreur réseau : ' + err.message);
  }
}

</script>

