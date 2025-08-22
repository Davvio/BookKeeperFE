<script setup lang="ts">
import { useToast } from '@/stores/toast'
const toast = useToast()
</script>

<template>
  <div class="fixed right-3 bottom-3 z-50 space-y-2">
    <div
      v-for="t in toast.items"
      :key="t.id"
      class="px-3 py-2 rounded-lg shadow-lg"
      :class="{
        'bg-[var(--bg-secondary)] text-[var(--text-primary)]': !t.kind || t.kind === 'info',
        'bg-green-600 text-white': t.kind === 'success',
        'bg-red-600 text-white': t.kind === 'error',
      }"
    >
      {{ t.text }}
    </div>
  </div>
</template>
