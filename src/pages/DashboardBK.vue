<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/stores/auth'
import { useItemsStore } from '@/stores/items'
import { api } from '@/services/api'
import { getItemIconUrl } from '@/services/itemsApi'

// ---- Auth / identity -------------------------------------------------------
const auth = useAuth()
if (!auth.token) auth.initFromStorage?.()

function parseJwt<T = any>(t: string): T | null {
  try {
    return JSON.parse(atob((t || '').split('.')[1] || ''))
  } catch {
    return null
  }
}
const claims = computed(() => parseJwt(auth.token || '') || {})
const userId = computed<number>(() => Number((claims.value as any).sub || 0))
const username = computed<string>(() => (claims.value as any).username || 'User')
const structureId = computed<string>(() => (claims.value as any).structure_id || '—')
const canCreateEntry = computed(
  () =>
    auth.hasRole?.('ADMIN') ||
    auth.hasRole?.('QUARTERMASTER') ||
    Boolean((claims.value as any).permissions?.['inventory.admin']),
)

// ---- Data state -------------------------------------------------------------
type InvItem = {
  item_id: number
  quantity: number
  price?: number | null
  value?: number | null
  item_code?: string | null
  item_name?: string | null
}
type Snapshot = {
  items: InvItem[]
  total_value?: number | null
}

type LedgerRow = {
  id?: number
  trade_id?: number
  timestamp: string
  item_id: number
  delta_qty: number
  movement_reason_code?: string
}

type TradeRow = { id: number; timestamp: string }

const loading = ref(false)
const lastUpdated = ref<string>('')

const snapshot = ref<Snapshot>({ items: [], total_value: null })
const ledger = ref<LedgerRow[]>([])
const trades = ref<TradeRow[]>([])

const itemsStore = useItemsStore()

// ---- Fetchers ---------------------------------------------------------------
function nowIso() {
  return new Date().toISOString()
}

async function fetchAll() {
  if (!userId.value) return
  loading.value = true
  try {
    if (!itemsStore.items.length) await itemsStore.refresh()

    const as_of = nowIso()

    // Player snapshot with value as_of now
    const [snapRes, ledgerRes, tradesRes] = await Promise.all([
      api.get(`/inventory/player/${userId.value}`, { params: { as_of } }),
      api.get(`/inventory/player/${userId.value}/ledger`, { params: { limit: 20, offset: 0 } }),
      api.get('/trades'),
    ])

    snapshot.value = {
      items: Array.isArray(snapRes.data?.items) ? snapRes.data.items : snapRes.data || [],
      total_value: snapRes.data?.total_value ?? null,
    }
    ledger.value = Array.isArray(ledgerRes.data) ? ledgerRes.data : []
    trades.value = Array.isArray(tradesRes.data) ? tradesRes.data : []

    lastUpdated.value = new Date().toLocaleString()
  } finally {
    loading.value = false
  }
}
onMounted(fetchAll)

// ---- Derivations / helpers --------------------------------------------------
const distinctItems = computed(() => snapshot.value.items.length)

const totalValue = computed(() => {
  if (typeof snapshot.value.total_value === 'number') return snapshot.value.total_value
  // fallback if API didn’t compute total_value
  return snapshot.value.items.reduce((acc, it) => acc + (Number(it.value) || 0), 0)
})

const topItems = computed(() => {
  // sort by value desc; fallback to qty if no value
  const arr = snapshot.value.items.slice().sort((a, b) => {
    const va = a.value ?? 0,
      vb = b.value ?? 0
    if (vb !== va) return vb - va
    return (b.quantity || 0) - (a.quantity || 0)
  })
  return arr.slice(0, 8)
})

function itemName(item_id: number, fallback?: string | null): string {
  const it = itemsStore.byId[item_id]
  return it?.name || fallback || `#${item_id}`
}

function valueFmt(n?: number | null): string {
  if (typeof n !== 'number') return '—'
  // light format; could localize if you prefer
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function timeFmt(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

const lastMovementAt = computed<string>(() => timeFmt(ledger.value[0]?.timestamp))

// entries involving you in last 30 days
const entries30d = computed<number>(() => {
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000
  return trades.value.filter((t) => new Date(t.timestamp).getTime() >= cutoff).length
})

// Sparkline data (activity by day, last 14 days)
const activity14 = computed(() => {
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    d.setHours(0, 0, 0, 0)
    return { key: d.getTime(), count: 0, d }
  })
  const map = new Map(days.map((x) => [x.key, x]))

  for (const t of trades.value) {
    const d = new Date(t.timestamp)
    d.setHours(0, 0, 0, 0)
    const k = d.getTime()
    if (map.has(k)) map.get(k)!.count++
  }
  return days.map((x) => x.count)
})
const maxActivity = computed(() => Math.max(1, ...activity14.value))

function refresh() {
  fetchAll()
}
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <div>
        <div class="text-xl">Welcome, {{ username }}</div>
        <div class="text-xs opacity-70">Structure: {{ structureId }}</div>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button class="btn" :disabled="loading" @click="refresh">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
        <div class="text-xs opacity-70">Last updated: {{ lastUpdated || '—' }}</div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid gap-3 grid-cols-1 md:grid-cols-4">
      <div class="kpi">
        <div class="kpi__label">My inventory value</div>
        <div class="kpi__value">{{ valueFmt(totalValue) }}</div>
        <div class="kpi__hint">As of now</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">Distinct items</div>
        <div class="kpi__value">{{ distinctItems }}</div>
        <div class="kpi__hint">Currently held</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">Entries (30d)</div>
        <div class="kpi__value">{{ entries30d }}</div>
        <div class="kpi__hint">Involving you</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">Last movement</div>
        <div class="kpi__value text-sm">{{ lastMovementAt }}</div>
        <div class="kpi__hint">From your ledger</div>
      </div>
    </div>

    <!-- Row: Inventory & Activity -->
    <div class="grid gap-3 grid-cols-1 lg:grid-cols-3">
      <!-- My Inventory -->
      <div class="card lg:col-span-2">
        <div class="flex items-center justify-between mb-2">
          <div class="text-base font-medium">My Inventory (top by value)</div>
          <RouterLink
            to="/inventory?tab=players"
            class="text-xs opacity-80 hover:opacity-100 underline"
          >
            Open Inventory workspace
          </RouterLink>
        </div>

        <div v-if="!snapshot.items.length && !loading" class="empty-row">
          No items in your inventory.
        </div>

        <div v-else class="inv-table">
          <div class="inv-head">
            <div>Item</div>
            <div class="text-right">Qty</div>
            <div class="text-right">Unit</div>
            <div class="text-right">Value</div>
          </div>

          <div v-for="it in topItems" :key="it.item_id" class="inv-row">
            <div class="flex items-center gap-2 min-w-0">
              <img
                class="icon"
                :src="getItemIconUrl(it.item_id)"
                alt=""
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              />
              <div class="truncate">
                <div class="font-medium truncate">{{ itemName(it.item_id, it.item_name) }}</div>
                <div class="text-xs opacity-60 mono">#{{ it.item_id }}</div>
              </div>
            </div>
            <div class="text-right">{{ it.quantity }}</div>
            <div class="text-right">{{ valueFmt(it.price ?? null) }}</div>
            <div class="text-right">
              {{ valueFmt(it.value ?? (it.price || 0) * (it.quantity || 0)) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Activity (sparkline & quick facts) -->
      <div class="card">
        <div class="text-base font-medium mb-2">Your Activity (last 14 days)</div>

        <svg viewBox="0 0 140 40" preserveAspectRatio="none" class="w-full h-16">
          <polyline
            :points="
              activity14
                .map((c, i) => `${(i / 13) * 140},${40 - (c / maxActivity) * 36 - 2}`)
                .join(' ')
            "
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>

        <div class="text-xs opacity-70 mt-1">Bars represent daily entries you’re involved in.</div>

        <div class="mt-3 text-xs">
          <RouterLink to="/trades" class="underline">See all entries</RouterLink>
          <span v-if="canCreateEntry" class="opacity-60"> · </span>
          <RouterLink v-if="canCreateEntry" to="/create-trade" class="underline"
            >Create entry</RouterLink
          >
        </div>
      </div>
    </div>

    <!-- Recent Activity feed -->
    <div class="card">
      <div class="flex items-center justify-between mb-2">
        <div class="text-base font-medium">Recent Activity</div>
        <div class="text-xs opacity-70">Latest from your player ledger</div>
      </div>

      <div v-if="!ledger.length && !loading" class="empty-row">No recent movements yet.</div>

      <div v-else class="feed">
        <div
          v-for="row in ledger"
          :key="row.timestamp + '-' + (row.trade_id || 0) + '-' + row.item_id"
          class="feed-row"
        >
          <div class="feed-time">{{ timeFmt(row.timestamp) }}</div>
          <div class="feed-main">
            <span class="mono">{{ row.delta_qty >= 0 ? '+' : '' }}{{ row.delta_qty }}</span>
            <span> of </span>
            <strong>{{ itemName(row.item_id) }}</strong>
            <span v-if="row.movement_reason_code" class="chip">{{ row.movement_reason_code }}</span>
          </div>
          <div class="feed-link">
            <RouterLink v-if="row.trade_id" :to="`/trades#id-${row.trade_id}`" class="underline"
              >Entry #{{ row.trade_id }}</RouterLink
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Your Entries list -->
    <div class="card">
      <div class="flex items-center justify-between mb-2">
        <div class="text-base font-medium">Your Entries</div>
        <div class="text-xs opacity-70">
          Includes entries you created or where you are a party in at least one line.
        </div>
      </div>

      <div v-if="!trades.length && !loading" class="empty-row">You have no entries yet.</div>

      <div v-else class="trows">
        <div class="trow head">
          <div>ID</div>
          <div>When</div>
        </div>
        <div v-for="t in trades.slice(0, 10)" :key="t.id" class="trow">
          <div>#{{ t.id }}</div>
          <div>{{ timeFmt(t.timestamp) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-xl {
  font-size: 1.25rem;
}

.card {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 12px;
}

.btn {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
  cursor: pointer;
}

/* KPIs */
.kpi {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 12px;
}
.kpi__label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.kpi__value {
  font-size: 1.2rem;
  margin-top: 2px;
}
.kpi__hint {
  font-size: 0.7rem;
  opacity: 0.7;
}

/* Inventory table */
.inv-head,
.inv-row {
  display: grid;
  grid-template-columns: 2.4fr 0.8fr 0.8fr 1fr;
  gap: 8px;
  align-items: center;
}
.inv-head {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--bg-tertiary);
}

/* Feed */
.feed {
  display: grid;
  gap: 8px;
}
.feed-row {
  display: grid;
  grid-template-columns: 1.2fr 2fr 1fr;
  gap: 8px;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 10px;
  padding: 8px;
}
.feed-time {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.chip {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  margin-left: 6px;
}

/* Entries table */
.trows {
  display: grid;
  gap: 8px;
}
.trow {
  display: grid;
  grid-template-columns: 0.6fr 1.6fr;
  gap: 8px;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 10px;
  padding: 8px;
}
.trow.head {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0;
}

.empty-row {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  border: 1px dashed var(--bg-tertiary);
  border-radius: 10px;
}

/* mono font */
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}
</style>
