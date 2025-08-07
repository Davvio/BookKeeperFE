<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/services/api'
import { useRouter } from 'vue-router'

const fromLocation = ref('')
const toLocation = ref('')
const itemsGiven = ref([{ name: '', quantity: 1 }])
const itemsGained = ref([{ name: '', quantity: 1 }])
const success = ref(false)
const error = ref('')
const router = useRouter()

async function submitTrade() {
  error.value = ''
  try {
    await api.post('/trades/', {
      items_given: itemsGiven.value,
      items_gained: itemsGained.value,
      from_location: fromLocation.value,
      to_location: toLocation.value,
    })
    success.value = true
    setTimeout(() => router.push('/trades'), 1000)
  } catch {
    error.value = 'Failed to create trade.'
  }
}

function addGivenItem() {
  itemsGiven.value.push({ name: '', quantity: 1 })
}

function addGainedItem() {
  itemsGained.value.push({ name: '', quantity: 1 })
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto text-[--text-primary]">
    <h1 class="text-2xl font-bold mb-6">➕ Create Trade</h1>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label class="block text-sm mb-1">From Location</label>
        <input v-model="fromLocation" class="w-full p-2 rounded bg-[--bg-tertiary] text-white" />
      </div>
      <div>
        <label class="block text-sm mb-1">To Location</label>
        <input v-model="toLocation" class="w-full p-2 rounded bg-[--bg-tertiary] text-white" />
      </div>
    </div>

    <div class="mb-6">
      <label class="block text-sm font-semibold mb-2">Items Given</label>
      <div v-for="(item, index) in itemsGiven" :key="'given-' + index" class="flex gap-2 mb-2">
        <input
          v-model="item.name"
          placeholder="Item name"
          class="flex-1 p-2 rounded bg-[--bg-tertiary]"
        />
        <input type="number" v-model="item.quantity" class="w-20 p-2 rounded bg-[--bg-tertiary]" />
      </div>
      <button @click="addGivenItem" class="text-sm text-[--accent]">+ Add Item</button>
    </div>

    <div class="mb-6">
      <label class="block text-sm font-semibold mb-2">Items Gained</label>
      <div v-for="(item, index) in itemsGained" :key="'gained-' + index" class="flex gap-2 mb-2">
        <input
          v-model="item.name"
          placeholder="Item name"
          class="flex-1 p-2 rounded bg-[--bg-tertiary]"
        />
        <input type="number" v-model="item.quantity" class="w-20 p-2 rounded bg-[--bg-tertiary]" />
      </div>
      <button @click="addGainedItem" class="text-sm text-[--accent]">+ Add Item</button>
    </div>

    <div class="flex justify-between items-center mt-6">
      <button
        @click="submitTrade"
        class="bg-[--accent] px-4 py-2 rounded text-white font-semibold hover:opacity-90 transition"
      >
        Submit Trade
      </button>

      <div v-if="success" class="text-green-400 text-sm">Trade created successfully ✅</div>
      <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
    </div>
  </div>
</template>
