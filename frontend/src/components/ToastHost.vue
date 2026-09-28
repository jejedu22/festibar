<!-- frontend/src/components/ToastHost.vue -->
<template>
  <div class="fixed top-2 inset-x-2 z-50 flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
    <div
      v-for="t in ui.toasts"
      :key="t.id"
      role="status"
      class="pointer-events-auto max-w-md w-full rounded-lg shadow-lg px-4 py-3 text-white flex justify-between items-start gap-3"
      :class="{ 'bg-green-700': t.type === 'success', 'bg-red-700': t.type === 'error', 'bg-gray-800': t.type === 'info' }"
    >
      <span>{{ t.message }}</span>
      <button class="font-bold" aria-label="Fermer la notification" @click="ui.dismiss(t.id)">✕</button>
    </div>
  </div>
</template>

<script setup>
import { useUiStore } from '@/stores/ui'
const ui = useUiStore()
</script>
