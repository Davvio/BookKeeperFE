<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  // when provided, user must type this string to enable confirm
  requireText?: string
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm'): void }>()

const typed = ref('')
const ok = computed(() => !props.requireText || typed.value.trim() === props.requireText)
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/55" @click="emit('close')" />
    <div
      class="relative w-[min(560px,92vw)] p-4 rounded-xl bg-[var(--bg-secondary)] shadow-[var(--panel-shadow)]"
    >
      <div class="text-lg font-medium">{{ title || 'Confirm' }}</div>
      <p class="mt-2 text-sm opacity-80 whitespace-pre-wrap">{{ message }}</p>

      <div v-if="requireText" class="mt-3">
        <label class="text-xs opacity-80 block mb-1">
          Type
          <span class="font-mono bg-[var(--bg-tertiary)] px-1 py-0.5 rounded">{{
            requireText
          }}</span>
          to confirm
        </label>
        <input
          v-model="typed"
          class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
          placeholder="Type here…"
        />
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="px-3 py-2 rounded bg-[var(--bg-tertiary)]" @click="emit('close')">
          {{ cancelLabel || 'Cancel' }}
        </button>
        <button
          class="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50"
          :disabled="!ok"
          @click="emit('confirm')"
        >
          {{ confirmLabel || 'Delete' }}
        </button>
      </div>
    </div>
  </div>
</template>
