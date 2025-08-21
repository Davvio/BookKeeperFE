<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  listMyParties,
  listAllParties,
  type PartyMeOut,
  type PartyListRow,
} from '@/services/partiesApi'
import { useComms } from '@/stores/comms'
import { useAuth } from '@/stores/auth'

const loading = ref(false)
const q = ref('')
const partiesMine = ref<PartyMeOut[]>([])
const partiesAll = ref<PartyListRow[]>([])
const comms = useComms()

const auth = useAuth()
function perms(): Record<string, boolean> {
  try {
    const json = JSON.parse(atob((auth.token || '').split('.')[1] || ''))
    return json.permissions || {}
  } catch {
    return {}
  }
}
const isAdmin = computed(() => !!perms()['users.admin'])

async function load() {
  loading.value = true
  try {
    partiesMine.value = await listMyParties()
    if (isAdmin.value) partiesAll.value = await listAllParties()
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => comms.partiesVersion, load) // 👈 refresh when inspector bumps version

const qlower = computed(() => q.value.trim().toLowerCase())
const mineIds = computed(() => new Set(partiesMine.value.map((p) => p.id)))

const combined = computed(() => {
  if (!isAdmin.value) {
    return partiesMine.value.map((p) => ({
      id: p.id,
      name: p.name,
      members: p.members.length,
      mine: true,
    }))
  }
  return partiesAll.value
    .map((p) => ({
      id: p.id,
      name: p.name,
      members: p.members_count,
      mine: mineIds.value.has(p.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filtered = computed(() =>
  !qlower.value
    ? combined.value
    : combined.value.filter((p) => (p.name || '').toLowerCase().includes(qlower.value)),
)

const select = (id: number) => comms.selectParty(id)
</script>

<template>
  <div class="min-w-0">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-base">Parties</h3>
      <slot name="actions" />
    </div>

    <input
      v-model="q"
      placeholder="Search party…"
      class="w-full max-w-full min-w-0 block py-2 rounded-md bg-[var(--bg-tertiary)] outline-none"
    />

    <div class="mt-2 max-h-[280px] overflow-auto">
      <div v-if="loading" class="text-sm opacity-70">Loading…</div>
      <div v-else-if="!filtered.length" class="text-sm opacity-70">No parties found.</div>

      <button
        v-for="p in filtered"
        :key="p.id"
        @click="select(p.id)"
        class="w-full text-left py-2 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] mt-1"
        :class="comms.selectedPartyId === p.id ? 'bg-[var(--accent)]/20' : ''"
      >
        <div class="flex items-center justify-between">
          <div class="font-medium truncate">{{ p.name }}</div>
          <span v-if="isAdmin && !p.mine" class="text-[10px] py-0.5 rounded bg-[var(--bg-tertiary)]"
            >other</span
          >
        </div>
        <div class="text-xs opacity-70">Members: {{ p.members }}</div>
      </button>
    </div>
  </div>
</template>
