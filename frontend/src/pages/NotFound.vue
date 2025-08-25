<!-- frontend/src/pages/NotFound.vue -->
<template>
  <div class="flex flex-col items-center justify-center h-screen text-center">
    <h1 class="text-6xl font-bold text-red-500">404</h1>
    <p class="text-xl mt-4">Oups ! La page que vous cherchez n’existe pas.</p>

    <router-link
      to="/"
      class="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Retour à l’accueil
    </router-link>
  </div>
</template>

<script setup>
// Page 404 statique
</script>
