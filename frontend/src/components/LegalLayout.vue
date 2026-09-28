<!-- frontend/src/components/LegalLayout.vue -->
<template>
  <div class="max-w-2xl mx-auto p-4">
    <router-link to="/" class="text-sm text-blue-700 underline">← Accueil</router-link>
    <article class="legal mt-4">
      <h1 class="text-2xl font-bold mb-4">{{ title }}</h1>
      <slot />
    </article>
    <LegalFooter />
  </div>
</template>

<script setup>
import LegalFooter from './LegalFooter.vue'
defineProps({ title: { type: String, required: true } })
</script>

<style scoped>
.legal :deep(h2) { font-size: 1.15rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
.legal :deep(p), .legal :deep(ul) { margin-bottom: 0.75rem; line-height: 1.6; }
.legal :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.legal :deep(a) { color: #1d4ed8; text-decoration: underline; }
</style>
