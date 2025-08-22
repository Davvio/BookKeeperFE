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
import { listUsersLite, type UserLite } from '@/services/usersApi'
import { listMovementReasons, type MovementReason } from '@/services/movementReasonsApi'
import { getItemIconUrl } from '@/services/itemsApi'
import { useMovementReasonsStore } from '../stores/movementReasons'
import PartySelect from '@/components/PartySelect.vue'
import { useAuth } from '@/stores/auth'

const auth = useAuth()
function hasPerm(k: string) {
  try {
    const json = JSON.parse(atob((auth.token || '').split('.')[1] || '')) || {}
    return !!json.permissions?.[k]
  } catch {
    return false
  }
}
const canCreateEntry = computed(
  () => auth.hasRole?.('ADMIN') || auth.hasRole?.('QUARTERMASTER') || hasPerm('inventory.admin'),
)

const createdId = ref<number | null>(null)

type Party = 'location' | 'user'
const partyOptions = [
  { label: 'Location', value: 'location' },
  { label: 'User', value: 'user' },
]

type Row = {
  item_id: number | null
  direction: Direction
  quantity: number | null
  from_location_id: number | null
  to_location_id: number | null
  from_user_id: number | null
  to_user_id: number | null
  movement_reason_code: string | null // <— NEW
  from_party: Party // <— NEW
  to_party: Party // <— NEW
}

const showHeader = ref(false)
const itemsStore = useItemsStore()
const locsStore = useLocationsStore()
const users = ref<UserLite[]>([])

const saving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

const timestamp = ref(new Date().toISOString())
const fromLocation = ref<number | null>(null)
const toLocation = ref<number | null>(null)
const reasonsStore = useMovementReasonsStore()

const rows = ref<Row[]>([
  {
    item_id: null,
    direction: 'GAINED',
    quantity: null,
    from_location_id: null,
    to_location_id: null,
    from_user_id: null,
    to_user_id: null,
    movement_reason_code: null,
    from_party: 'location',
    to_party: 'location',
  },
])

onMounted(async () => {
  if (itemsStore.items.length === 0) await itemsStore.refresh()
  if (locsStore.locations.length === 0) await locsStore.refresh(true)
  users.value = await listUsersLite()
  await reasonsStore.ensureLoaded()

  const raw = sessionStorage.getItem('bk_trade_draft')
  if (raw) {
    try {
      const draft = JSON.parse(raw)
      if (draft.timestamp) timestamp.value = draft.timestamp
      fromLocation.value = draft.from_location_id ?? null
      toLocation.value = draft.to_location_id ?? null
      rows.value = (draft.lines || []).map((ln: any) => ({
        item_id: ln.item_id ?? null,
        direction: ln.direction ?? 'GAINED',
        quantity: ln.quantity ?? null,
        from_location_id: ln.from_location_id ?? null,
        to_location_id: ln.to_location_id ?? null,
        from_user_id: ln.from_user_id ?? null,
        to_user_id: ln.to_user_id ?? null,
        movement_reason_code: ln.movement_reason_code ?? null,
        from_party: ln.from_user_id != null ? 'user' : 'location',
        to_party: ln.to_user_id != null ? 'user' : 'location',
      }))
    } catch {}
    sessionStorage.removeItem('bk_trade_draft')
  }
})

function addRow(dir: Direction = 'GAINED') {
  rows.value.push({
    item_id: null,
    direction: dir,
    quantity: null,
    from_location_id: null,
    to_location_id: null,
    from_user_id: null,
    to_user_id: null,
    movement_reason_code: null,
    from_party: 'location',
    to_party: 'location',
  })
}

function removeRow(idx: number) {
  if (rows.value.length <= 1) return
  rows.value.splice(idx, 1)
}

function safeItemIconUrl(it: Partial<Item> | number | null | undefined): string | null {
  // BkSelect may call this before items are loaded or with a primitive
  if (it && typeof it === 'object' && 'id' in it && typeof it.id === 'number') {
    const id = it.id as number
    return getItemIconUrl(id, itemsStore.iconBust[id] ?? '')
  }
  return null
}

const canSubmit = computed(() => {
  if (rows.value.length === 0) return false
  for (let i = 0; i < rows.value.length; i++) {
    const r = rows.value[i]
    const okItemQty = r.item_id !== null && r.quantity !== null && r.quantity > 0

    const effectiveFromLoc = resolveLoc(r.from_location_id as any, fromLocation.value)
    const effectiveToLoc = resolveLoc(r.to_location_id as any, toLocation.value)

    const okFrom =
      (r.from_party === 'user' && r.from_user_id !== null) ||
      (r.from_party === 'location' && effectiveFromLoc !== null)
    const okTo =
      (r.to_party === 'user' && r.to_user_id !== null) ||
      (r.to_party === 'location' && effectiveToLoc !== null)

    if (!(okItemQty && okFrom && okTo)) return false
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

function labelUserById(id: number): string {
  const u = users.value.find((u) => u.id === id)
  return u ? u.username : `#${id}`
}
function getUserValue(u: UserLite): number {
  return u.id
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

  const lines: TradeLineIn[] = rows.value.map((r) => {
    const fromLoc = resolveLoc(r.from_location_id as any, fromLocation.value)
    const toLoc = resolveLoc(r.to_location_id as any, toLocation.value)

    const line: TradeLineIn = {
      item_id: r.item_id as number,
      direction: r.direction,
      quantity: Number(r.quantity),
    }

    if (r.movement_reason_code) line.movement_reason_code = r.movement_reason_code

    if (r.from_party === 'user') line.from_user_id = r.from_user_id as number
    else if (fromLoc !== null) line.from_location_id = fromLoc as number

    if (r.to_party === 'user') line.to_user_id = r.to_user_id as number
    else if (toLoc !== null) line.to_location_id = toLoc as number

    return line
  })

  const payload: TradeCreate = {
    timestamp: timestamp.value,
    ...(fromLocation.value !== null ? { from_location_id: fromLocation.value } : {}),
    ...(toLocation.value !== null ? { to_location_id: toLocation.value } : {}),
    lines,
  }

  saving.value = true
  try {
    console.log('payload lines:', JSON.stringify(payload.lines))
    const res = await createTrade(payload)
    createdId.value = res.id
    successMsg.value = `Entry #${res.id} saved. Profit: ${res.profit === null ? '—' : res.profit}`
    rows.value = [
      {
        item_id: null,
        direction: 'GAINED',
        quantity: null,
        from_location_id: null,
        to_location_id: null,
        from_user_id: null,
        to_user_id: null,
        movement_reason_code: null,
        from_party: 'location',
        to_party: 'location',
      },
    ]
    timestamp.value = new Date().toISOString()
  } catch (e: unknown) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to save entry.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <div class="mb-3 flex items-center">
      <h2 class="text-xl mb-4">Create Entry</h2>
      <!-- Success banner -->
      <div v-if="createdId" class="alert ok">
        Entry created (#{{ createdId }}) —
        <RouterLink :to="`/trades#id-${createdId}`">View in All Entries</RouterLink>
      </div>
      <!-- No access card -->
      <div v-if="!canCreateEntry" class="card">
        <div class="text-sm">
          Creating entries is limited to <strong>Quartermasters</strong> and
          <strong>Admins</strong>. If you think this is a mistake, contact a Quartermaster.
        </div>
      </div>
      <button
        class="btn--sm ml-3"
        @click="showHeader = !showHeader"
        :aria-expanded="showHeader ? 'true' : 'false'"
      >
        <span class="arrow" aria-hidden="true">{{ showHeader ? '▾' : '▸' }}</span>
        {{ showHeader ? 'Hide header' : 'Show header' }}
      </button>
    </div>

    <div v-if="showHeader" class="card">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <button class="btn" @click="addRow('GAINED')">+ Add Row</button>
        </div>
      </div>

      <div class="lines-header">
        <div>Movement type</div>
        <div>Qty</div>
        <div>Item</div>
        <div>From (override)</div>
        <div>To (override)</div>
        <div></div>
      </div>

      <div v-for="(r, idx) in rows" :key="idx" class="lines-row">
        <!-- Movement type -->
        <BkSelect
          :items="reasonsStore.reasons"
          v-model="r.movement_reason_code"
          :getLabel="(mr: any) => mr.name"
          :getValue="(mr: any) => mr.code"
          placeholder="Select type…"
        />

        <!-- Qty -->
        <input
          type="number"
          min="1"
          class="input"
          :value="r.quantity ?? ''"
          @input="r.quantity = Number(($event.target as HTMLInputElement).value || '0')"
        />

        <!-- Item (with icon) -->
        <BkSelect
          :items="itemsStore.items"
          v-model="r.item_id"
          :getLabel="(it: Item) => it.name"
          :getValue="getItemValue"
          :getIconUrl="safeItemIconUrl"
          placeholder="Select item…"
        />

        <!-- From (party + picker) -->
        <PartySelect
          v-model:party="r.from_party"
          v-model:locationId="r.from_location_id"
          v-model:userId="r.from_user_id"
          :locations="locsStore.locations"
          :users="users"
          sideLabel="From"
        />

        <!-- To (party + picker) -->
        <PartySelect
          v-model:party="r.to_party"
          v-model:locationId="r.to_location_id"
          v-model:userId="r.to_user_id"
          :locations="locsStore.locations"
          :users="users"
          sideLabel="To"
        />

        <button class="btn danger" @click="removeRow(idx)" :disabled="rows.length <= 1">×</button>
      </div>
    </div>

    <div class="mt-4 flex gap-2 items-center">
      <button class="btn primary" :disabled="saving || !canSubmit" @click="submit">
        Save Entry
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
  width: 95%;
  padding: 8px 0px;
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
  grid-template-columns: 1.5fr 0.8fr 2fr 2.2fr 2.2fr 0.5fr; /* type | qty | item | from | to | remove */
  gap: 12px;
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

.alert.ok {
  background: #203a2f;
  color: #9ee0bf;
  padding: 8px 10px;
  border-radius: 8px;
}
.card {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 12px;
}
.text-xl {
  font-size: 1.25rem;
}
.btn.primary {
  background: var(--accent);
  color: var(--bg-primary);
}
</style>
