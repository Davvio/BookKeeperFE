<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { AxiosError } from 'axios'
import BkSelect from '@/components/BkSelect.vue'
import { useItemsStore } from '@/stores/items'
import { listValues, createValue } from '@/services/valuesApi'

type ItemValue = {
  id: number
  structure_id: string
  item_id: number
  value_in_currency: string
  effective_from: string
}

const itemsStore = useItemsStore()

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const selectedItemId = ref<number | null>(null)
const rows = ref<ItemValue[]>([])

const valueInput = ref<string>('') // number as string to keep precise control
const effectiveInput = ref<string>('') // ISO local (yyyy-MM-ddTHH:mm)

function clearAlerts() {
  errorMsg.value = ''
  successMsg.value = ''
}

async function loadForItem() {
  rows.value = []
  if (selectedItemId.value === null) return
  loading.value = true
  clearAlerts()
  try {
    // When item_id is provided, backend returns latest first (desc)
    const data = await listValues(selectedItemId.value)
    rows.value = data
  } catch (e: unknown) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to load valuations.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    if (itemsStore.items.length === 0) {
      await itemsStore.refresh()
    }
    // Preselect first item if any
    if (itemsStore.items.length > 0) {
      selectedItemId.value = itemsStore.items[0].id
      await loadForItem()
    }
  } finally {
    loading.value = false
  }
})

watch(selectedItemId, async () => {
  await loadForItem()
})

const currentValue = computed<string>(() => {
  if (rows.value.length === 0) return '—'
  return rows.value[0].value_in_currency
})

function formatDT(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString()
}

function validNumberString(s: string): boolean {
  // allow up to 6 decimals like backend Numeric(20,6)
  if (!/^\d+(\.\d{1,6})?$/.test(s)) return false
  const n = Number(s)
  if (Number.isNaN(n)) return false
  if (n < 0.001 || n > 1_000_000) return false
  return true
}

async function addValuation() {
  clearAlerts()
  if (selectedItemId.value === null) {
    errorMsg.value = 'Select an item.'
    return
  }
  if (!validNumberString(valueInput.value)) {
    errorMsg.value = 'Enter a valid number between 0.001 and 1,000,000 (max 6 decimals).'
    return
  }

  saving.value = true
  try {
    const payload: { item_id: number; value_in_currency: number; effective_from?: string } = {
      item_id: selectedItemId.value,
      value_in_currency: Number(valueInput.value),
    }
    // If a date-time is provided, convert to ISO; else omit to use backend default (now)
    if (effectiveInput.value.length > 0) {
      const iso = new Date(effectiveInput.value).toISOString()
      payload.effective_from = iso
    }
    await createValue(payload)
    successMsg.value = 'Valuation added.'
    valueInput.value = ''
    // keep the chosen effectiveInput; not auto-cleared so you can add multiple at same time if desired
    await loadForItem()
  } catch (e: unknown) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to add valuation.'
  } finally {
    saving.value = false
  }
}

function itemName(id: number | null): string {
  if (id === null) return '—'
  const it = itemsStore.byId[id]
  return it ? it.name : `#${id}`
}
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl mb-4">Item Valuations</h2>

    <div v-if="errorMsg" class="alert err">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert ok">{{ successMsg }}</div>

    <div class="card mb-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="label">Item</label>
          <BkSelect
            :items="itemsStore.items"
            v-model="selectedItemId"
            :getLabel="(i) => i.name"
            :getValue="(i) => i.id"
            placeholder="Select item…"
          />
        </div>

        <div>
          <label class="label">New value</label>
          <input class="input" v-model="valueInput" inputmode="decimal" placeholder="e.g. 12.5" />
        </div>

        <div>
          <label class="label">Effective from (optional)</label>
          <input class="input" type="datetime-local" v-model="effectiveInput" />
        </div>
      </div>

      <div class="mt-3">
        <button
          class="btn primary"
          :disabled="saving || selectedItemId === null"
          @click="addValuation"
        >
          Add valuation
        </button>
        <span v-if="saving" class="ml-2">Saving…</span>
      </div>
    </div>

    <div class="card">
      <div class="mb-2">
        <div class="label">Current value for</div>
        <div class="current">
          {{ itemName(selectedItemId) }}: <strong>{{ currentValue }}</strong>
        </div>
      </div>

      <div v-if="loading">Loading…</div>
      <div v-else>
        <div class="thead">
          <div>Effective from</div>
          <div class="text-right">Value</div>
        </div>

        <div v-if="rows.length === 0" class="empty-row">
          No valuations yet for {{ itemName(selectedItemId) }}.
        </div>

        <div v-for="r in rows" :key="r.id" class="trow">
          <div>{{ formatDT(r.effective_from) }}</div>
          <div class="text-right mono">{{ r.value_in_currency }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-xl {
  font-size: 1.25rem;
}
.mb-4 {
  margin-bottom: 16px;
}
.mb-2 {
  margin-bottom: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.ml-2 {
  margin-left: 8px;
}
.card {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 12px;
}
.label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: inline-block;
  margin-bottom: 6px;
}
.input {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 8px;
}
.btn {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
  cursor: pointer;
}
.btn.primary {
  background: var(--accent);
  color: var(--bg-primary);
}
.alert {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 8px;
}
.alert.ok {
  background: #203a2f;
  color: #9ee0bf;
}
.alert.err {
  background: #3a2222;
  color: #ffb4b4;
}
.current {
  color: var(--text-primary);
}

.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: 1fr;
}
.md\:grid-cols-3 {
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .md\:grid-cols-3 {
    grid-template-columns: 1.4fr 1fr 1fr;
  }
}
.gap-3 {
  gap: 12px;
}

.thead,
.trow {
  display: grid;
  grid-template-columns: 1.6fr 0.6fr;
  gap: 8px;
  align-items: center;
}
.thead {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.trow {
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 10px;
  padding: 8px;
}
.empty-row {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  border: 1px dashed var(--bg-tertiary);
  border-radius: 10px;
}
.mono {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}
</style>
