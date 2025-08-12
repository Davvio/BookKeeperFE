<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useItemsStore } from '@/stores/items'
import { useLocationsStore } from '@/stores/locations'
import { listTrades, type TradeOut, type TradeLineOut } from '@/services/tradesApi'

const itemsStore = useItemsStore()
const locsStore = useLocationsStore()

const loading = ref(false)
const errorMsg = ref('')
const trades = ref<TradeOut[]>([])
const expanded = ref<Set<number>>(new Set())
const q = ref('') // search text

onMounted(async () => {
  loading.value = true
  try {
    if (itemsStore.items.length === 0) await itemsStore.refresh()
    if (locsStore.locations.length === 0) await locsStore.refresh(true)
    trades.value = await listTrades()
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Failed to load trades.'
  } finally {
    loading.value = false
  }
})

function toggleRow(id: number) {
  const s = new Set(expanded.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expanded.value = s
}
function isExpanded(id: number) {
  return expanded.value.has(id)
}

function fmtDate(iso: string | Date) {
  try {
    return new Date(iso as any).toLocaleString()
  } catch {
    return String(iso)
  }
}
function locName(id: number | null | undefined) {
  if (id == null) return '—'
  const loc = locsStore.byId[id]
  return loc ? loc.name : `#${id}`
}
function itemName(id: number | null | undefined) {
  if (id == null) return '—'
  const it = itemsStore.byId[id]
  return it ? it.name : `#${id}`
}
function lineCount(t: TradeOut) {
  const g = Array.isArray(t.gained) ? t.gained.length : 0
  const v = Array.isArray(t.given) ? t.given.length : 0
  return g + v
}
function mergedLines(t: TradeOut): Array<TradeLineOut & { direction: 'GAINED' | 'GIVEN' }> {
  const gained = (t.gained || []).map((l) => ({ ...l, direction: 'GAINED' as const }))
  const given = (t.given || []).map((l) => ({ ...l, direction: 'GIVEN' as const }))
  return [...gained, ...given]
}

/* ---------- SEARCH (includes user) ---------- */
function matchesTrade(t: TradeOut, s: string): boolean {
  const sIn = (v: unknown) =>
    String(v ?? '')
      .toLowerCase()
      .includes(s)

  // collapsed/header fields + user
  if (
    sIn(t.id) ||
    sIn(t.username) ||
    sIn(t.user_id) ||
    sIn(t.profit) ||
    sIn(t.timestamp) ||
    sIn(locName(t.from_location_id as any)) ||
    sIn(locName(t.to_location_id as any))
  )
    return true

  // any line
  for (const ln of mergedLines(t)) {
    if (
      sIn(itemName(ln.item_id as any)) ||
      sIn(locName(ln.from_location_id as any)) ||
      sIn(locName(ln.to_location_id as any)) ||
      sIn(ln.direction) ||
      sIn(ln.quantity)
    )
      return true
  }
  return false
}

const viewTrades = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return trades.value
  return trades.value.filter((t) => matchesTrade(t, s))
})
const totalShown = computed(() => viewTrades.value.length)
</script>

<template>
  <div class="p-4">
    <div class="head">
      <h2 class="title">All Trades</h2>
      <div class="actions">
        <input
          v-model="q"
          class="search"
          type="search"
          placeholder="Search by user, ID, item, location, direction…"
        />
      </div>
    </div>

    <div class="meta">{{ totalShown }} shown</div>
    <div v-if="errorMsg" class="err">{{ errorMsg }}</div>

    <div class="card">
      <div class="table">
        <!-- Header -->
        <div class="tr th">
          <div class="cell exp"></div>
          <div class="cell id">ID</div>
          <div class="cell ts">Timestamp</div>
          <div class="cell user">User</div>
          <div class="cell from">From (trade)</div>
          <div class="cell to">To (trade)</div>
          <div class="cell lines"># Lines</div>
          <div class="cell profit">Profit</div>
        </div>

        <!-- Rows -->
        <template v-if="!loading">
          <div v-for="t in viewTrades" :key="t.id" class="group">
            <!-- Collapsed summary -->
            <div class="tr row" @click="toggleRow(t.id)">
              <div class="cell exp">
                <span class="caret" :class="{ open: isExpanded(t.id) }">▸</span>
              </div>
              <div class="cell id">#{{ t.id }}</div>
              <div class="cell ts">{{ fmtDate(t.timestamp as any) }}</div>
              <div class="cell user">
                {{ t.username }} <span class="uid">(#{{ t.user_id }})</span>
              </div>
              <div class="cell from">{{ locName(t.from_location_id as any) }}</div>
              <div class="cell to">{{ locName(t.to_location_id as any) }}</div>
              <div class="cell lines">{{ lineCount(t) }}</div>
              <div class="cell profit">{{ t.profit ?? '—' }}</div>
            </div>

            <!-- Expanded: exact tradelines -->
            <div v-if="isExpanded(t.id)" class="expanded">
              <div class="tr th sub">
                <div class="cell item">Item</div>
                <div class="cell dir">Direction</div>
                <div class="cell qty">Qty</div>
                <div class="cell from">From (line)</div>
                <div class="cell to">To (line)</div>
              </div>

              <div v-for="(ln, idx) in mergedLines(t)" :key="idx" class="tr subrow">
                <div class="cell item">{{ itemName(ln.item_id as any) }}</div>
                <div class="cell dir">
                  <span class="chip" :class="ln.direction === 'GAINED' ? 'ok' : 'warn'">
                    {{ ln.direction }}
                  </span>
                </div>
                <div class="cell qty">{{ ln.quantity }}</div>
                <div class="cell from">{{ locName(ln.from_location_id as any) }}</div>
                <div class="cell to">{{ locName(ln.to_location_id as any) }}</div>
              </div>
            </div>
          </div>
        </template>

        <div v-if="loading" class="loading">Loading…</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.title {
  font-size: 1.25rem;
}
.actions {
  display: flex;
  gap: 8px;
}

.search {
  min-width: 280px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  background: var(--bg-tertiary);
  color: var(--text-primary);
  outline: none;
}
.search::placeholder {
  color: var(--text-muted);
}
.search:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(92, 106, 196, 0.25);
}

.meta {
  color: var(--text-muted, #8a92b2);
  margin-bottom: 8px;
}

.card {
  background: var(--bg-secondary, #1d2238);
  border-radius: 12px;
  padding: 8px;
}
.table {
  width: 100%;
}

/* Add a User column (160px) */
.tr {
  display: grid;
  grid-template-columns: 40px 80px 220px 160px 1fr 1fr 90px 120px;
  gap: 8px;
  align-items: center;
  padding: 8px;
}
.th {
  color: var(--text-muted, #8a92b2);
  font-size: 0.9rem;
}

.row {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  cursor: pointer;
}
.row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.expanded {
  margin: 4px 0 12px 40px;
  border-left: 2px solid rgba(255, 255, 255, 0.08);
  padding-left: 12px;
}
.tr.subrow,
.tr.th.sub {
  grid-template-columns: 1.2fr 130px 100px 1fr 1fr;
}
.cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.uid {
  color: var(--text-muted);
  margin-left: 6px;
}

.caret {
  display: inline-block;
  transform: rotate(0deg);
  transition: transform 0.15s ease;
  opacity: 0.9;
}
.caret.open {
  transform: rotate(90deg);
}

.chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.chip.ok {
  background: #12351f;
  color: #8ff0b2;
  border-color: #235d3c;
}
.chip.warn {
  background: #3a1c1c;
  color: #ffb4b4;
  border-color: #7a2b2b;
}

.loading {
  padding: 16px;
  color: var(--text-muted, #8a92b2);
}
.err {
  color: #ff9494;
  margin-bottom: 8px;
}
</style>
