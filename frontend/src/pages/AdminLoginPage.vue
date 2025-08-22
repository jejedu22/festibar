<!-- frontend/src/pages/AdminLoginPage.vue -->
<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <h1 class="text-xl mb-4 font-bold">Connexion Admin</h1>

    <input
      v-model="password"
      type="password"
      placeholder="Mot de passe"
      class="border border-gray-300 p-2 rounded w-64 mb-3"
    />

    <button
      @click="login"
      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-64"
    >
      Se connecter
    </button>

    <p v-if="error" class="text-red-500 mt-3">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const password = ref("");
const error = ref("");
const router = useRouter();

async function login() {
  try {
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.value }),
    });

    if (res.ok) {
      localStorage.setItem("isAdminAuthenticated", "true");
      router.push("/admin/organizations");
    } else {
      const data = await res.json();
      error.value = data.error || "Erreur de connexion";
    }
  } catch {
    error.value = "Erreur réseau";
  }
}
</script>
