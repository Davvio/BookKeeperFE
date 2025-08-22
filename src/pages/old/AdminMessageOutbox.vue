<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listOutbox, type MessageOutboxRow } from '@/services/messagesApi'

const loading = ref(false)
const rows = ref<MessageOutboxRow[]>([])
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await listOutbox(100)
  } catch {
    error.value = 'Failed to load'
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-xl font-600 mb-2">Message Outbox</h1>
    <div v-if="error" class="text-red-5">{{ error }}</div>
    <div v-if="loading">Loading…</div>

    <table class="w-full">
      <thead>
        <tr>
          <th class="text-left">ID</th>
          <th>Kind</th>
          <th class="text-left">Text</th>
          <th>Queued</th>
          <th>Failed</th>
          <th>Acked</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id" class="hover:bg-[var(--bg-tertiary)]">
          <td class="px-2 py-1">{{ r.id }}</td>
          <td class="text-center">{{ r.kind }}</td>
          <td class="px-2 truncate max-w-2xl">{{ r.text }}</td>
          <td class="text-center">{{ r.queued }}</td>
          <td class="text-center">{{ r.failed }}</td>
          <td class="text-center">{{ r.acked }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
