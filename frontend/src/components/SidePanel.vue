<!-- frontend/src/components/SidePanel.vue -->
<!-- Panneau de formulaire : tiroir à droite sur grand écran, feuille montant du bas sur téléphone -->
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 flex items-end sm:items-stretch sm:justify-end" @keydown.esc="$emit('close')">
      <div class="absolute inset-0 bg-slate-900/40" aria-hidden="true" @click="$emit('close')"></div>
      <section
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="relative bg-white w-full sm:w-[440px] max-h-[92vh] sm:max-h-none rounded-t-[22px] sm:rounded-none flex flex-col shadow-2xl"
      >
        <div class="sm:hidden flex justify-center pt-2.5" aria-hidden="true"><span class="w-11 h-1.5 rounded bg-slate-300"></span></div>
        <header class="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p v-if="kicker" class="text-[13px] text-slate-600">{{ kicker }}</p>
            <h2 :id="titleId" class="font-display font-bold text-[22px] leading-tight break-words">{{ title }}</h2>
          </div>
          <button type="button" class="icon-btn" aria-label="Fermer le panneau" @click="$emit('close')">
            <Icon name="close" :size="18" :stroke="2.2" />
          </button>
        </header>
        <div class="flex-1 overflow-y-auto overscroll-contain">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="px-5 pt-3 pb-5 border-t border-slate-200 bg-white">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '' },
  kicker: { type: String, default: '' },
})
defineEmits(['close'])

const titleId = `panel-${Math.random().toString(36).slice(2, 8)}`
const panel = ref(null)

// À l'ouverture : focus sur le premier champ du panneau
watch(() => props.open, async value => {
  if (!value) return
  await nextTick()
  panel.value?.querySelector('input, select, textarea, button:not([aria-label="Fermer le panneau"])')?.focus()
})
</script>
