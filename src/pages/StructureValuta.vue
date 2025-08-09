<!-- src/pages/StructureValuta.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getSettings, setCurrency } from '@/services/structureApi'
import { listItems, type Item } from '@/services/itemsApi'
import BkSelect from '@/components/BkSelect.vue'

const settings = ref<{
  structure_id: string
  currency_item_id: number | null
  currency_item_name: string | null
} | null>(null)
const items = ref<Item[]>([])
const selected = ref<number | null>(null)
const saving = ref(false)
const msg = ref<string>('')

async function load() {
  const [s, its] = await Promise.all([getSettings(), listItems({ active: true })])
  settings.value = s
  items.value = its
  selected.value = s.currency_item_id
}
async function save() {
  if (!selected.value) return
  saving.value = true
  msg.value = ''
  await setCurrency(selected.value)
  await load()
  saving.value = false
  msg.value = 'Saved!'
}
const itemOptions = computed(() => items.value.map((i) => ({ id: i.id, name: i.name })))
onMounted(load)
</script>

<template>
  <div class="p-6 space-y-4">
    <h2 class="text-2xl font-bold">Structure Currency</h2>
    <p v-if="settings">
      Current: <b>{{ settings.currency_item_name || '—' }}</b>
    </p>

    <div class="max-w-lg p-4 border rounded bg-[--bg-secondary] space-y-3">
      <label class="text-sm">Choose currency</label>
      <BkSelect
        v-model="selected"
        :items="itemOptions"
        :getLabel="(i) => i.name"
        :getValue="(i) => i.id"
        placeholder="Select currency"
      />
      <button @click="save" class="px-3 py-2 border rounded" :disabled="saving">Save</button>
      <span class="text-green-600 text-sm" v-if="msg">{{ msg }}</span>
    </div>
  </div>
</template>
