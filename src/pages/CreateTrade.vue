<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AxiosError } from 'axios'
import BkSelect from '@/components/BkSelect.vue'
import { useItemsStore } from '@/stores/items'
import { useLocationsStore } from '@/stores/locations'
import {
  createTrade,
  type TradeCreate,
  type TradeLineIn,
  type Direction,
} from '@/services/tradesApi'
import type { Item } from '@/services/itemsApi'
import type { Location } from '@/services/locationsApi'

type Row = {
  item_id: number | null
  direction: Direction
  quantity: number | null
  from_location_id: number | null
  to_location_id: number | null
}

const itemsStore = useItemsStore()
const locsStore = useLocationsStore()

const saving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

const timestamp = ref(new Date().toISOString())
const fromLocation = ref<number | null>(null)
const toLocation = ref<number | null>(null)

const rows = ref<Row[]>([
  {
    item_id: null,
    direction: 'GAINED',
    quantity: null,
    from_location_id: null,
    to_location_id: null,
  },
])

onMounted(async () => {
  if (itemsStore.items.length === 0) await itemsStore.refresh()
  if (locsStore.locations.length === 0) await locsStore.refresh(true)
})

function addRow(dir: Direction = 'GAINED') {
  rows.value.push({
    item_id: null,
    direction: dir,
    quantity: null,
    from_location_id: null,
    to_location_id: null,
  })
}

function removeRow(idx: number) {
  if (rows.value.length <= 1) return
  rows.value.splice(idx, 1)
}

const canSubmit = computed(() => {
  if (rows.value.length === 0) return false
  for (let i = 0; i < rows.value.length; i++) {
    const r = rows.value[i]
    const okItemQty = r.item_id !== null && r.quantity !== null && r.quantity > 0

    const effectiveFrom = resolveLoc(r.from_location_id as any, fromLocation.value)
    const effectiveTo = resolveLoc(r.to_location_id as any, toLocation.value)

    // at least one location present (change to && if you want both required)
    const okLoc = effectiveFrom !== null || effectiveTo !== null

    if (!(okItemQty && okLoc)) return false
  }
  return true
})

function labelItemById(id: number): string {
  const it = itemsStore.byId[id]
  return it ? it.name : `#${id}`
}
function getItemValue(item: Item): number {
  return item.id
}

function labelLocById(id: number): string {
  const loc = locsStore.byId[id]
  return loc ? loc.name : `#${id}`
}
function getLocValue(loc: Location): number {
  return loc.id
}

function resolveLoc(rowVal: number | null | undefined, headerVal: number | null): number | null {
  // coerce strings -> numbers if any component emits string ids
  const v = typeof rowVal === 'string' ? parseInt(rowVal, 10) : rowVal
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const h = typeof headerVal === 'string' ? parseInt(headerVal as any, 10) : headerVal
  return typeof h === 'number' && !Number.isNaN(h) ? h : null
}

async function submit() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!canSubmit.value) {
    errorMsg.value = 'Please complete all rows with item and quantity > 0.'

    return
  }

  const lines: TradeLineIn[] = rows.value.map((r) => ({
    item_id: r.item_id as number,
    direction: r.direction,
    quantity: Number(r.quantity),
    from_location_id: resolveLoc(r.from_location_id as any, fromLocation.value),
    to_location_id: resolveLoc(r.to_location_id as any, toLocation.value),
  }))

  const payload: TradeCreate = {
    timestamp: timestamp.value,
    from_location_id: fromLocation.value,
    to_location_id: toLocation.value,
    lines,
  }

  saving.value = true
  try {
    console.log('payload lines:', JSON.stringify(payload.lines))
    const res = await createTrade(payload)
    successMsg.value = `Trade #${res.id} saved. Profit: ${res.profit === null ? '—' : res.profit}`
    rows.value = [
      {
        item_id: null,
        direction: 'GAINED',
        quantity: null,
        from_location_id: null,
        to_location_id: null,
      },
    ]
    timestamp.value = new Date().toISOString()
  } catch (e: unknown) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to save trade.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl mb-4">Create Trade</h2>

    <div class="card">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="label">Timestamp</label>
          <input
            type="datetime-local"
            class="input"
            :value="new Date(timestamp).toISOString().slice(0, 16)"
            @input="timestamp = new Date(($event.target as HTMLInputElement).value).toISOString()"
          />
        </div>

        <div>
          <label class="label">From location (optional)</label>
          <BkSelect
            :items="locsStore.locations"
            v-model="fromLocation"
            :getLabel="(loc: Location) => loc.name"
            :getValue="getLocValue"
            placeholder="Select from..."
          />
        </div>

        <div>
          <label class="label">To location (optional)</label>
          <BkSelect
            :items="locsStore.locations"
            v-model="toLocation"
            :getLabel="(loc: Location) => loc.name"
            :getValue="getLocValue"
            placeholder="Select to..."
          />
        </div>
      </div>
    </div>

    <div class="mt-6 card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg">Lines</h3>
        <div class="flex gap-2">
          <button class="btn" @click="addRow('GAINED')">+ Gained</button>
          <button class="btn" @click="addRow('GIVEN')">+ Given</button>
        </div>
      </div>

      <div class="lines-header">
        <div>Item</div>
        <div>Direction</div>
        <div>Qty</div>
        <div>From (override)</div>
        <div>To (override)</div>
        <div></div>
      </div>

      <div v-for="(r, idx) in rows" :key="idx" class="lines-row">
        <BkSelect
          :items="itemsStore.items"
          v-model="r.item_id"
          :getLabel="(it: Item) => it.name"
          :getValue="getItemValue"
          placeholder="Select item..."
        />
        <select v-model="r.direction" class="input">
          <option value="GAINED">GAINED</option>
          <option value="GIVEN">GIVEN</option>
        </select>
        <input
          type="number"
          min="1"
          class="input"
          :value="r.quantity ?? ''"
          @input="r.quantity = Number(($event.target as HTMLInputElement).value || '0')"
        />
        <BkSelect
          :items="locsStore.locations"
          v-model="r.from_location_id"
          :getLabel="(loc: Location) => loc.name"
          :getValue="getLocValue"
          placeholder="Use header"
        />
        <BkSelect
          :items="locsStore.locations"
          v-model="r.to_location_id"
          :getLabel="(loc: Location) => loc.name"
          :getValue="getLocValue"
          placeholder="Use header"
        />
        <button class="btn danger" @click="removeRow(idx)" :disabled="rows.length <= 1">×</button>
      </div>
    </div>

    <div class="mt-4 flex gap-2 items-center">
      <button class="btn primary" :disabled="saving || !canSubmit" @click="submit">
        Save Trade
      </button>
      <span v-if="saving">Saving…</span>
      <span v-if="successMsg" class="ok">{{ successMsg }}</span>
      <span v-if="errorMsg" class="err">{{ errorMsg }}</span>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 12px;
}
.label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 6px;
  color: var(--text-secondary);
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
.btn:disabled {
  opacity: 0.5;
  filter: grayscale(0.3);
  cursor: not-allowed;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.danger {
  background: #7a2b2b;
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
    grid-template-columns: 1fr 1fr 1fr;
  }
}
.gap-3 {
  gap: 12px;
}
.mt-4 {
  margin-top: 16px;
}
.mt-6 {
  margin-top: 24px;
}
.mb-3 {
  margin-bottom: 12px;
}
.text-xl {
  font-size: 1.25rem;
}
.text-lg {
  font-size: 1.1rem;
}
.flex {
  display: flex;
}
.items-center {
  align-items: center;
}
.justify-between {
  justify-content: space-between;
}
.gap-2 {
  gap: 8px;
}
.ok {
  color: #3bb273;
}
.err {
  color: #e65a5a;
}

.lines-header,
.lines-row {
  display: grid;
  grid-template-columns: 2fr 1fr 0.8fr 1.6fr 1.6fr 0.5fr;
  gap: 8px;
  align-items: center;
}
.lines-header {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.lines-row + .lines-row {
  margin-top: 8px;
}
</style>
