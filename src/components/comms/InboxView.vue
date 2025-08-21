<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- src/components/comms/InboxView.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getInbox, ackMessages, type MCMessage } from '@/services/messagesApi'

const loading = ref(false)
const msgs = ref<MCMessage[]>([])
let timer: any = null

async function refresh() {
  loading.value = true
  try {
    msgs.value = await getInbox()
  } finally {
    loading.value = false
  }
}
defineExpose({ refresh }) // <-- allows parent to trigger manual refresh

async function ackOne(id: number, ok: boolean) {
  if (ok) await ackMessages([id], [])
  else await ackMessages([], [id])
  await refresh()
}

onMounted(async () => {
  await refresh()
  timer = setInterval(refresh, 60000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div>
    <div v-if="loading" class="text-sm opacity-70">Loading…</div>
    <div v-else-if="!msgs.length" class="text-sm opacity-70">No messages.</div>

    <div class="space-y-2">
      <div v-for="m in msgs" :key="m.id" class="rounded-lg p-3 bg-[var(--bg-tertiary)]">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)]">
            {{ m.kind }}
          </div>
          <div class="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)]">
            Pos: {{ m.position }}
          </div>
          <div class="text-xs opacity-70">{{ new Date(m.created_at).toLocaleString() }}</div>
        </div>
        <div class="mt-2 whitespace-pre-wrap text-sm">{{ m.text }}</div>
        <div class="mt-2 flex gap-2">
          <button class="px-0 py-1 rounded bg-green-600 text-white" @click="ackOne(m.id, true)">
            Mark delivered
          </button>
          <button class="px-0 py-1 rounded bg-red-600 text-white" @click="ackOne(m.id, false)">
            Mark failed
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
