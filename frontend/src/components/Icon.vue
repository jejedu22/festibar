<!-- frontend/src/components/Icon.vue -->
<!-- Icônes vectorielles (trait), décoratives : le texte ou aria-label du bouton porte le sens -->
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(d, i) in paths" :key="i" :d="d" />
    <circle v-for="(c, i) in circles" :key="`c${i}`" :cx="c[0]" :cy="c[1]" :r="c[2]" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  stroke: { type: [Number, String], default: 2 },
})

const ICONS = {
  plus: { p: ['M12 5v14M5 12h14'] },
  search: { p: ['M20 20l-3.5-3.5'], c: [[11, 11, 7]] },
  copy: { p: ['M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z', 'M5 15V5a2 2 0 0 1 2-2h8'] },
  edit: { p: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'] },
  trash: { p: ['M3 6h18', 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', 'M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6'] },
  arrow: { p: ['M5 12h14M13 6l6 6-6 6'] },
  close: { p: ['M6 6l12 12M18 6L6 18'] },
  logout: { p: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'] },
  eye: { p: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'], c: [[12, 12, 3]] },
  eyeOff: { p: ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1', 'M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'] },
  mug: { p: ['M7 4h9v4h2a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-2v1a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z'] },
  cart: { p: ['M2 3h3l2.4 11.2a1 1 0 0 0 1 .8H18a1 1 0 0 0 1-.8L20.5 7H6'], c: [[9, 20, 1.5], [18, 20, 1.5]] },
  menu: { p: ['M4 5h16M4 12h16M4 19h10'] },
  clipboard: { p: ['M9 4h6l1 2h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3z', 'M9 12h6M9 16h4'] },
  chart: { p: ['M4 20V10M10 20V4M16 20v-7M22 20H2'] },
  warning: { p: ['M12 9v4M12 17h.01', 'M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'] },
  download: { p: ['M12 3v12M7 10l5 5 5-5', 'M5 21h14'] },
  chevronDown: { p: ['M6 9l6 6 6-6'] },
  chevronUp: { p: ['M6 15l6-6 6 6'] },
  grip: { p: ['M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01'] },
  printer: { p: ['M6 9V3h12v6', 'M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2', 'M6 14h12v7H6z'] },
}

const icon = computed(() => ICONS[props.name] || { p: [] })
const paths = computed(() => icon.value.p || [])
const circles = computed(() => icon.value.c || [])
</script>
