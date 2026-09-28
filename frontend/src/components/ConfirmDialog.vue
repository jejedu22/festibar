<!-- frontend/src/components/ConfirmDialog.vue -->
<template>
  <div
    v-if="d"
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    @click.self="ui.closeDialog(false)"
    @keydown.esc="ui.closeDialog(false)"
  >
    <div role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" class="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
      <h2 id="dialog-title" class="text-lg font-bold mb-2">{{ d.title }}</h2>
      <p v-if="d.message" class="text-gray-700 mb-4 whitespace-pre-line">{{ d.message }}</p>

      <label v-if="d.requireText" class="block mb-4">
        <span class="text-sm">Tapez <strong>{{ d.requireText }}</strong> pour confirmer :</span>
        <input ref="input" v-model="typed" class="w-full border rounded p-2 mt-1" autocomplete="off" />
      </label>

      <div class="flex gap-2 justify-end">
        <button ref="cancelBtn" class="px-4 py-2 rounded bg-gray-200" @click="ui.closeDialog(false)">
          {{ d.cancelLabel }}
        </button>
        <button
          class="px-4 py-2 rounded text-white disabled:opacity-40"
          :class="d.danger ? 'bg-red-600' : 'bg-blue-600'"
          :disabled="!!d.requireText && typed !== d.requireText"
          @click="ui.closeDialog(true)"
        >
          {{ d.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const d = computed(() => ui.dialog)
const typed = ref('')
const input = ref(null)
const cancelBtn = ref(null)

watch(d, async value => {
  typed.value = ''
  if (!value) return
  await nextTick()
  ;(input.value || cancelBtn.value)?.focus()
})
</script>
