<!-- src/pages/ItemValuations.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { listItems, type Item } from '@/services/itemsApi'
import { listValues, createValue, type ItemValue } from '@/services/valuesApi'
import BkSelect from '@/components/BkSelect.vue'

const items = ref<Item[]>([])
const values = ref<ItemValue[]>([])
const selectedItemId = ref<number | null>(null)
const currentValue = computed(() => {
  if (!selectedItemId.value) return null
  const v = values.value.find((v) => v.item_id === selectedItemId.value)
  return v?.value_in_currency ?? null
})
const inputValue = ref<string>('')

async function loadItems() {
  items.value = await listItems({ active: true })
}
async function loadValues(itemId?: number) {
  values.value = await listValues(itemId)
}

async function onSelect() {
  await loadValues(selectedItemId.value ?? undefined)
  inputValue.value = ''
}
async function save() {
  if (!selectedItemId.value || !inputValue.value) return
  await createValue({ item_id: selectedItemId.value, value_in_currency: inputValue.value })
  await onSelect()
}
onMounted(async () => {
  await loadItems()
})
</script>

<template>
  <div class="p-6 space-y-4">
    <h2 class="text-2xl font-bold">Item Valuations</h2>

    <div class="max-w-2xl p-4 border rounded bg-[--bg-secondary] space-y-3">
      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label class="text-sm">Item</label>
          <BkSelect
            v-model="selectedItemId"
            :items="items"
            :getLabel="(i) => i.name"
            :getValue="(i) => i.id"
            placeholder="Select item"
            @update:modelValue="onSelect"
          />
        </div>
        <div>
          <label class="text-sm">Current effective value</label>
          <div class="border rounded px-3 py-2 bg-white">{{ currentValue ?? '—' }}</div>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label class="text-sm">New value (effective now)</label>
          <input
            v-model="inputValue"
            placeholder="e.g. 3.5"
            class="border px-3 py-2 rounded w-full"
          />
        </div>
        <div class="flex items-end">
          <button @click="save" class="px-3 py-2 border rounded">Save valuation</button>
        </div>
      </div>

      <div v-if="selectedItemId" class="mt-2">
        <h3 class="font-semibold">History</h3>
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-gray-50">
              <th class="border px-2 py-2 text-left">Effective From</th>
              <th class="border px-2 py-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in values.filter((v) => v.item_id === selectedItemId)" :key="v.id">
              <td class="border px-2 py-2">{{ new Date(v.effective_from).toLocaleString() }}</td>
              <td class="border px-2 py-2">{{ v.value_in_currency }}</td>
            </tr>
            <tr v-if="values.filter((v) => v.item_id === selectedItemId).length === 0">
              <td colspan="2" class="border px-2 py-4 text-center opacity-70">No valuations</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
