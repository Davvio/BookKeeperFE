<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/services/api'

interface TradeItem {
  name: string
  quantity: number
}
interface Trade {
  id: number
  timestamp: string
  items_given: TradeItem[]
  items_gained: TradeItem[]
  from_location: string
  to_location: string
}
const trades = ref<Trade[]>([])
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await api.get<Trade[]>('/trades/')
    trades.value = response.data
  } catch {
    error.value = 'Failed to fetch trades.'
  } finally {
    loading.value = false
  }
})

function formatItems(items: TradeItem[]) {
  return items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
}
</script>

<template>
  <div class="p-8 min-h-screen bg-[--bg-primary] text-[--text-primary]">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">📦 Trade Log</h1>

      <div v-if="loading" class="text-muted">Loading trades...</div>
      <div v-else-if="error" class="text-red-500">{{ error }}</div>

      <div v-else class="bg-[--bg-secondary] p-6 rounded-xl shadow-lg overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[--text-muted] border-b border-gray-700">
              <th class="p-3 font-semibold">From</th>
              <th class="p-3 font-semibold">To</th>
              <th class="p-3 font-semibold">Items Given</th>
              <th class="p-3 font-semibold">Items Gained</th>
              <th class="p-3 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="trade in trades"
              :key="trade.id"
              class="border-b border-gray-800 hover:bg-[--bg-tertiary] transition duration-150"
            >
              <td class="p-3">{{ trade.from_location }}</td>
              <td class="p-3">{{ trade.to_location }}</td>
              <td class="p-3">{{ formatItems(trade.items_given) }}</td>
              <td class="p-3">{{ formatItems(trade.items_gained) }}</td>
              <td class="p-3 whitespace-nowrap">
                {{ new Date(trade.timestamp).toLocaleString() }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
