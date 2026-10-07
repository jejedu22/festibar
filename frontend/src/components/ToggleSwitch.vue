<!-- frontend/src/components/ToggleSwitch.vue -->
<!-- Interrupteur accessible (role="switch"), zone tactile de 44 px -->
<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    class="w-[60px] h-11 inline-flex items-center justify-center shrink-0 disabled:opacity-50"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="relative block w-14 h-8 rounded-full transition-colors" :class="modelValue ? 'bg-green-700' : 'bg-slate-400'">
      <span class="absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all" :class="modelValue ? 'left-7' : 'left-1'"></span>
    </span>
  </button>
</template>

<script setup>
defineProps({ modelValue: Boolean, label: { type: String, required: true }, disabled: Boolean })
defineEmits(['update:modelValue'])
</script>
