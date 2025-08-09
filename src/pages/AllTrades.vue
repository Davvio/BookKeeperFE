<!-- src/pages/AllTrades.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/services/api'

type TradeItem = { name: string; quantity: number }
type Trade = {
  id: number
  timestamp: string
  items_gained: TradeItem[]
  items_given: TradeItem[]
  from_location: string
  to_location: string
  actor_user_id: number
  actor_username: string
  profit?: string | null
  currency_item_name?: string | null
  unpriced?: boolean
}

const player = ref('') // filtro: username OPPURE actor userId
const rows = ref<Trade[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// pagination
const page = ref(1)
const pageSize = ref(20)
const pageSizes = [10, 20, 50, 100]
const total = computed(() => rows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const url = player.value ? `/trades?player=${encodeURIComponent(player.value)}` : '/trades'
    const { data } = await api.get<Trade[]>(url)
    rows.value = Array.isArray(data) ? data : []
    page.value = 1
  } catch {
    error.value = 'Failed to load trades'
  } finally {
    loading.value = false
  }
}

function clearFilter() {
  player.value = ''
  load()
}

function fmtDate(s: string) {
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleString()
}

onMounted(load)
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Filters -->
    <div class="flex flex-wrap gap-2 items-center">
      <input
        v-model="player"
        placeholder="Filter by player (username or actor id)"
        class="border px-3 py-2 rounded w-72"
        @keyup.enter="load"
      />
      <button @click="load" class="px-3 py-2 border rounded hover:bg-gray-50">Search</button>
      <button @click="clearFilter" class="px-3 py-2 border rounded hover:bg-gray-50">Clear</button>

      <div class="ml-auto flex items-center gap-2">
        <span class="text-sm opacity-80">Rows per page</span>
        <select v-model.number="pageSize" class="border px-2 py-1 rounded">
          <option v-for="s in pageSizes" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <!-- States -->
    <div v-if="loading" class="opacity-80">Loading…</div>
    <div v-else-if="error" class="text-red-600">{{ error }}</div>

    <!-- Table -->
    <div v-else>
      <div class="mb-2 text-sm opacity-80">
        Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} of
        {{ total }}
      </div>

      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-50">
            <th class="border px-2 py-2 text-left">When</th>
            <th class="border px-2 py-2 text-left">Gained</th>
            <th class="border px-2 py-2 text-left">Given</th>
            <th class="border px-2 py-2 text-left">From</th>
            <th class="border px-2 py-2 text-left">To</th>
            <th class="border px-2 py-2 text-left">Actor</th>
            <th class="border px-2 py-2 text-left">Profit</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in paged" :key="r.id" class="hover:bg-gray-50">
            <td class="border px-2 py-2 whitespace-nowrap">{{ fmtDate(r.timestamp) }}</td>
            <td class="border px-2 py-2">
              <ul class="list-disc pl-5">
                <li v-for="g in r.items_gained" :key="'g+' + r.id + g.name + g.quantity">
                  {{ g.name }} × {{ g.quantity }}
                </li>
              </ul>
            </td>
            <td class="border px-2 py-2">
              <ul class="list-disc pl-5">
                <li v-for="g in r.items_given" :key="'v-' + r.id + g.name + g.quantity">
                  {{ g.name }} × {{ g.quantity }}
                </li>
              </ul>
            </td>
            <td class="border px-2 py-2">{{ r.from_location }}</td>
            <td class="border px-2 py-2">{{ r.to_location }}</td>
            <td class="border px-2 py-2">
              <span class="font-medium">{{ r.actor_username || '—' }}</span>
              <span v-if="r.actor_user_id" class="opacity-70">(#{{ r.actor_user_id }})</span>
            </td>
            <td class="border px-2 py-2">
              <div class="flex items-center gap-2">
                <span v-if="r.profit !== null && r.profit !== undefined">
                  {{ r.profit }} <span class="opacity-70">{{ r.currency_item_name || '' }}</span>
                </span>
                <span v-else class="opacity-60">—</span>
                <span v-if="r.unpriced" title="Some items not valued at that time">⚠️</span>
              </div>
            </td>
          </tr>
          <tr v-if="paged.length === 0">
            <td class="border px-2 py-6 text-center opacity-70" colspan="7">No trades found</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination controls -->
      <div class="flex items-center justify-between mt-3">
        <button
          class="px-3 py-2 border rounded disabled:opacity-50"
          :disabled="page <= 1"
          @click="page = Math.max(1, page - 1)"
        >
          Prev
        </button>
        <div class="text-sm">Page {{ page }} / {{ totalPages }}</div>
        <button
          class="px-3 py-2 border rounded disabled:opacity-50"
          :disabled="page >= totalPages"
          @click="page = Math.min(totalPages, page + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
