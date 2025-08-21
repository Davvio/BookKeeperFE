<!-- src/components/comms/OutboxView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getOutbox, type OutboxMessage } from '@/services/messagesApi'

const loading = ref(false)
const items = ref<OutboxMessage[]>([])

async function load() {
  loading.value = true
  try {
    items.value = await getOutbox(50)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading" class="text-sm opacity-70">Loading…</div>
    <div v-else-if="!items.length" class="text-sm opacity-70">No sent messages yet.</div>

    <div class="space-y-2">
      <div v-for="m in items" :key="m.id" class="rounded-lg p-3 bg-[var(--bg-tertiary)]">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)]">{{ m.kind }}</div>
          <div class="text-xs opacity-70">{{ new Date(m.created_at).toLocaleString() }}</div>
        </div>
        <div class="mt-2 text-sm whitespace-pre-wrap">{{ m.text }}</div>
      </div>
    </div>
  </div>
</template>
