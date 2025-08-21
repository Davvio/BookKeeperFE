<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- src/components/comms/PlayerList.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { listUsersLite, type UserLite } from '@/services/usersApi'
import { useComms } from '@/stores/comms'

const loading = ref(false)
const q = ref('')
const users = ref<UserLite[]>([])
const comms = useComms()

onMounted(async () => {
  loading.value = true
  try {
    users.value = await listUsersLite()
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return users.value
  return users.value.filter((u: { username: any }) =>
    (u.username || '').toLowerCase().includes(term),
  )
})

const select = (id: number) => comms.selectUser(id)
</script>

<template>
  <div class="min-w-0">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-base">Players</h3>
    </div>

    <input
      v-model="q"
      placeholder="Search player…"
      class="w-full max-w-full min-w-0 block px-0 py-2 rounded-md bg-[var(--bg-tertiary)] outline-none"
    />

    <div class="mt-2 max-h-[280px] overflow-auto">
      <div v-if="loading" class="text-sm opacity-70">Loading…</div>
      <div v-else-if="!filtered.length" class="text-sm opacity-70">No players found.</div>

      <button
        v-for="u in filtered"
        :key="u.id"
        @click="select(u.id)"
        class="w-full text-left px-3 py-2 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] mt-1"
        :class="comms.selectedUserId === u.id ? 'bg-[var(--accent)]/20' : ''"
      >
        <div class="font-medium truncate">{{ u.username }}</div>
        <!-- avoid overflow -->
      </button>
    </div>
  </div>
</template>
