<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  getInventorySummary,
  getItemByLocation,
  getInventoryByLocation,
  getLocationByItem,
  type InventoryItemRow,
  type ItemByLocationRow,
  type LocationSummaryRow,
  type LocationByItemRow,
} from '@/services/inventoryApi'
import InventoryAeGrid from '@/components/InventoryAeGrid.vue'

const tab = ref<'items' | 'locations'>('items')
const includeExternal = ref(false) // default: exclude externals for net worth
const asOf = ref(new Date().toISOString())

const loading = ref(false)
const errorMsg = ref('')

const itemsView = ref<'table' | 'grid'>('table')
watch(itemsView, () => load())

const itemSearch = ref('')

const filteredItemsByName = computed(() => {
  const base = Array.isArray(filteredItems?.value)
    ? filteredItems.value
    : Array.isArray(summary?.value)
      ? summary.value
      : []
  const q = itemSearch.value.trim().toLowerCase()
  if (!q) return base
  return base.filter((r) =>
    String(r.item_name || '')
      .toLowerCase()
      .includes(q),
  )
})

const aeSortedFiltered = computed(() => {
  const rows = Array.isArray(summary?.value) ? summary.value.slice() : []
  rows.sort((a, b) => b.qty - a.qty) // qty desc
  const q = itemSearch.value.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((r) =>
    String(r.item_name || '')
      .toLowerCase()
      .includes(q),
  )
})

// Data
const summary = ref<InventoryItemRow[]>([])
const grandTotal = ref(0)

// per-item breakdown cache
const byItemCache = ref(new Map<number, ItemByLocationRow[]>())
const loadingItem = ref<number | null>(null)

// location-first data
const locSummary = ref<LocationSummaryRow[]>([])
const byLocCache = ref(new Map<number, LocationByItemRow[]>())
const loadingLoc = ref<number | null>(null)

const aeSorted = computed(() => {
  // grid ignores the text search and sorts strictly by qty desc
  const rows = summary.value.slice()
  rows.sort((a, b) => b.qty - a.qty)
  return rows
})

// Search text
const q = ref('')

const filteredItems = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return summary.value
  return summary.value.filter((r) => {
    const inHeader =
      r.item_name.toLowerCase().includes(s) ||
      String(r.qty).includes(s) ||
      String(r.unit_value).includes(s) ||
      String(r.total_value).includes(s)
    const inCachedBreakdown = (byItemCache.value.get(r.item_id) || []).some((loc) =>
      loc.location_name.toLowerCase().includes(s),
    )
    return inHeader || inCachedBreakdown
  })
})

const filteredLocations = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return locSummary.value
  return locSummary.value.filter(
    (l) =>
      l.location_name.toLowerCase().includes(s) ||
      String(l.total_qty).includes(s) ||
      String(l.total_value).includes(s),
  )
})

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtQty(n: number) {
  return n.toLocaleString()
}

function switchTab(next: 'items' | 'locations') {
  tab.value = next
  load()
}

async function load() {
  errorMsg.value = ''
  loading.value = true
  try {
    if (tab.value === 'items') {
      const include = itemsView.value === 'grid' ? false : includeExternal.value
      const data = await getInventorySummary({
        as_of: asOf.value,
        include_external: include,
        show_zero: false, // change to true if you want zeros listed
      })
      summary.value = data.rows
      grandTotal.value = data.grand_total_value
    } else {
      const data = await getInventoryByLocation({
        as_of: asOf.value,
        include_external: includeExternal.value,
      })
      locSummary.value = data
    }
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Failed to load inventory.'
  } finally {
    loading.value = false
  }
}

async function expandItem(itemId: number) {
  if (byItemCache.value.has(itemId)) return
  loadingItem.value = itemId
  try {
    const rows = await getItemByLocation({
      itemId,
      as_of: asOf.value,
      include_external: true, // show where it sits incl. external
    })
    byItemCache.value.set(itemId, rows)
  } finally {
    loadingItem.value = null
  }
}

async function expandLocation(locationId: number) {
  if (byLocCache.value.has(locationId)) return
  loadingLoc.value = locationId
  try {
    const rows = await getLocationByItem({ locationId, as_of: asOf.value })
    byLocCache.value.set(locationId, rows)
  } finally {
    loadingLoc.value = null
  }
}

const asOfLocal = computed({
  get() {
    // datetime-local expects "YYYY-MM-DDTHH:mm"
    const d = new Date(asOf.value)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  },
  set(v: string) {
    asOf.value = new Date(v).toISOString()
  },
})

onMounted(load)
</script>

<template>
  <div class="p-4">
    <div class="toolbar">
      <div class="tabs">
        <button class="tab" :class="[tab === 'items' && 'active']" @click="switchTab('items')">
          By Item
        </button>
        <button
          class="tab"
          :class="[tab === 'locations' && 'active']"
          @click="switchTab('locations')"
        >
          By Location
        </button>
      </div>

      <div class="filters">
        <template v-if="tab === 'items'">
          <div class="btn-group">
            <button
              class="btn"
              :class="{ active: itemsView === 'table' }"
              @click="itemsView = 'table'"
            >
              Table
            </button>
            <button
              class="btn"
              :class="{ active: itemsView === 'grid' }"
              @click="itemsView = 'grid'"
            >
              AE Grid
            </button>
          </div>

          <input
            v-model.trim="itemSearch"
            class="search"
            type="search"
            placeholder="Search item name…"
          />

          <!-- Hide these on grid -->
          <template v-if="itemsView === 'table'">
            <label class="ctrl">
              <input type="checkbox" v-model="includeExternal" @change="load" />
              <span>Include external (Import/Export)</span>
            </label>
            <input v-model="q" class="search" type="search" placeholder="Search items/locations…" />
          </template>
        </template>

        <!-- Shared time + refresh still useful in both views -->
        <label class="ctrl">
          <span>As of</span>
          <input type="datetime-local" v-model="asOfLocal" />
        </label>
        <button class="btn" @click="load">Refresh</button>
      </div>
    </div>

    <div v-if="errorMsg" class="err">{{ errorMsg }}</div>

    <!-- By Item -->
    <div v-if="tab === 'items'" class="card">
      <div v-if="loading" class="loading">Loading…</div>

      <template v-else>
        <!-- AE GRID VIEW -->
        <InventoryAeGrid v-if="itemsView === 'grid'" :rows="aeSortedFiltered" />

        <!-- TABLE VIEW (original UI) -->
        <template v-else>
          <div class="tr th">
            <div class="cell exp"></div>
            <div class="cell item">Item</div>
            <div class="cell qty">Qty</div>
            <div class="cell unit">Unit</div>
            <div class="cell value">Value</div>
          </div>

          <div v-for="row in filteredItemsByName" :key="row.item_id" class="group">
            <details
              class="row"
              @toggle="($event.target as HTMLDetailsElement).open && expandItem(row.item_id)"
            >
              <summary class="tr">
                <div class="cell exp">▸</div>
                <div class="cell item">{{ row.item_name }}</div>
                <div class="cell qty">{{ fmtQty(row.qty) }}</div>
                <div class="cell unit">{{ fmtMoney(row.unit_value) }}</div>
                <div class="cell value">{{ fmtMoney(row.total_value) }}</div>
              </summary>

              <div class="expanded">
                <div class="tr th sub">
                  <div class="cell exp"></div>
                  <div class="cell loc">Location</div>
                  <div class="cell qty">Qty</div>
                  <div class="cell unit"></div>
                  <div class="cell value">Value</div>
                </div>

                <div v-if="loadingItem === row.item_id" class="loading">Loading item…</div>
                <div v-else>
                  <div
                    v-for="loc in byItemCache.get(row.item_id) || []"
                    :key="loc.location_id"
                    class="tr subrow"
                  >
                    <div class="cell exp"></div>
                    <div class="cell loc">
                      <span v-if="loc.is_external" class="chip warn">
                        {{ loc.location_name }} ({{ loc.external_kind }})
                      </span>
                      <span v-else>{{ loc.location_name }}</span>
                    </div>
                    <div class="cell qty">{{ fmtQty(loc.qty) }}</div>
                    <div class="cell unit"></div>
                    <div class="cell value">{{ fmtMoney(loc.value) }}</div>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div class="grand">
            <div>Grand total (net worth)</div>
            <div class="money">{{ fmtMoney(grandTotal) }}</div>
          </div>
        </template>
      </template>
    </div>

    <!-- By Location -->
    <div v-else class="card">
      <div class="tr th">
        <div class="cell exp"></div>
        <div class="cell loc">Location</div>
        <div class="cell qty">Total Qty</div>
        <div class="cell val">Total Value</div>
      </div>

      <div v-if="loading" class="loading">Loading…</div>

      <template v-else>
        <div v-for="loc in filteredLocations" :key="loc.location_id" class="group">
          <details
            class="row"
            @toggle="($event.target as HTMLDetailsElement).open && expandLocation(loc.location_id)"
          >
            <summary class="tr">
              <div class="cell exp">▸</div>
              <div class="cell loc">
                <span v-if="loc.is_external" class="chip warn"
                  >{{ loc.location_name }} ({{ loc.external_kind }})</span
                >
                <span v-else>{{ loc.location_name }}</span>
              </div>
              <div class="cell qty">{{ fmtQty(loc.total_qty) }}</div>
              <div class="cell val">{{ fmtMoney(loc.total_value) }}</div>
            </summary>

            <div class="expanded">
              <div class="tr th sub">
                <div class="cell exp"></div>
                <div class="cell item">Item</div>
                <div class="cell qty">Qty</div>
                <div class="cell val">Value</div>
              </div>

              <div v-if="loadingLoc === loc.location_id" class="loading">Loading location…</div>
              <div v-else>
                <div
                  v-for="it in byLocCache.get(loc.location_id) || []"
                  :key="it.item_id"
                  class="tr subrow byloc"
                >
                  <div class="cell exp"></div>
                  <div class="cell item">{{ it.item_name }}</div>
                  <div class="cell qty">{{ fmtQty(it.qty) }}</div>
                  <div class="cell val">{{ fmtMoney(it.value) }}</div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.tabs {
  display: flex;
  gap: 6px;
}
.tab {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  cursor: pointer;
}
.tab.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(92, 106, 196, 0.25);
}

.filters {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.ctrl {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--text-muted);
}
.ctrl input[type='datetime-local'] {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  cursor: pointer;
}
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 8px;
}

.tr {
  display: grid;
  grid-template-columns: 20px 1.5fr 1fr 1fr 1fr; /* exp | item | qty | unit | value */
  gap: 8px;
  align-items: center;
  padding: 8px;
}
.tr.th {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.tr.subrow,
.tr.th.sub {
  grid-template-columns: 20px 1.5fr 1fr 1fr 1fr;
}

.tr.th.sub {
  background: var(--bg-primary);
  border-radius: 6px;
}

.tr.subrow + .tr.subrow {
  margin-top: 4px;
}

/* each detail data row */
.tr.subrow {
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.tr.th:has(.loc) {
  grid-template-columns: 20px 1.5fr 1fr 1fr 1fr;
} /* its header */
.tr.subrow.byloc {
  grid-template-columns: 20px 1.5fr 1fr 1fr 1fr;
}

.row {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin: 6px 0;
}
.row > summary {
  list-style: none;
  cursor: pointer;
}

/* hide default marker (just in case) */
.row > summary::-webkit-details-marker {
  display: none;
}

/* make the arrow cell a fixed square and rotate from its center */
.cell.exp {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: 50% 50%;
  transition: transform 0.18s ease;
}

/* spin in place when details is open */
.row[open] > summary .cell.exp {
  transform: rotate(90deg);
}

.grand {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px 8px;
  margin-top: 6px;
  font-weight: 600;
}
.money {
  color: #8ff0b2;
}

.loading {
  padding: 12px;
  color: var(--text-muted);
}
.err {
  color: #ff9494;
  margin-bottom: 8px;
}

.chip.warn {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  background: #3a1c1c;
  color: #ffb4b4;
  border: 1px solid #7a2b2b;
}

.cell.qty,
.cell.unit,
.cell.value,
.cell.val {
  text-align: right;
}
.search {
  min-width: 240px;
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

.expanded {
  background: var(--bg-secondary);
}

.btn-group {
  display: inline-flex;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  overflow: hidden;
}
.btn-group .btn {
  border: 0;
  border-right: 1px solid var(--border-subtle);
}
.btn-group .btn:last-child {
  border-right: 0;
}
.btn-group .btn.active {
  background: var(--accent);
  color: var(--bg-primary);
}
</style>
