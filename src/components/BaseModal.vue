<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
    <div class="relative bg-[var(--bg-secondary)] rounded-xl p-4 w-[min(520px,90vw)] shadow-lg">
      <slot />
    </div>
  </div>
</template>
