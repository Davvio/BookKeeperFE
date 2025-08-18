<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import BkSelect from '@/components/BkSelect.vue'
import { useAuth } from '@/stores/auth'

import { useItemsStore } from '@/stores/items'
import { useLocationsStore } from '@/stores/locations'
import { useMovementReasonsStore } from '@/stores/movementReasons'
import { listUsersLite, type UserLite } from '@/services/usersApi'
import { getItemIconUrl } from '@/services/itemsApi'
import type { Item } from '@/services/itemsApi'

import {
  getPlayerInventory,
  getPlayerLedger,
  type PlayerInventorySnapshot,
  type PlayerLedgerEntry,
} from '@/services/playerInventoryApi'

/* ---------- stores & helpers ---------- */
const auth = useAuth()
const itemsStore = useItemsStore()
const locsStore = useLocationsStore()
const reasonsStore = useMovementReasonsStore()

const users = ref<UserLite[]>([])
const usersById = computed(() => {
  const m: Record<number, UserLite> = {}
  for (const u of users.value) m[u.id] = u
  return m
})

function safeItemIcon(it: any): string | null {
  const id =
    it && typeof it === 'object' && 'id' in it && typeof it.id === 'number'
      ? (it.id as number)
      : typeof it === 'number'
        ? it
        : null
  return id ? getItemIconUrl(id, itemsStore.iconBust[id] ?? '') : null
}
function itemName(id: number) {
  return itemsStore.byId[id]?.name ?? `#${id}`
}
function username(id: number) {
  return usersById.value[id]?.username ?? `User #${id}`
}

/* ---------- state ---------- */
const loading = ref(false)
const errorMsg = ref('')
const snap = ref<PlayerInventorySnapshot | null>(null)
const expanded = ref<Set<number>>(new Set()) // item_id set for current user
const ledgerCache = ref<Record<number, PlayerLedgerEntry[]>>({}) // by item_id

/* ---------- filters ---------- */
const q = ref('') // text filter (item name)
const selUserId = ref<number | null>(null)
const selItemId = ref<number | null>(null) // optional item filter
const asOfDate = ref<string>('') // YYYY-MM-DD

/* ---------- load ---------- */
async function loadSnapshot() {
  if (!selUserId.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const asOfIso = asOfDate.value ? new Date(asOfDate.value).toISOString() : undefined
    snap.value = await getPlayerInventory(selUserId.value, asOfIso)
    expanded.value = new Set() // collapse when user/asOf changes
    ledgerCache.value = {} // clear cache (valuation context changed)
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Failed to load inventory.'
  } finally {
    loading.value = false
  }
}

async function loadLedgerIfNeeded(itemId: number) {
  if (!selUserId.value) return
  if (ledgerCache.value[itemId]) return
  try {
    const res = await getPlayerLedger(selUserId.value, 500, 0) // grab a generous page
    // keep only rows for this item to cut memory
    ledgerCache.value[itemId] = res.rows.filter((r) => r.item_id === itemId)
  } catch (e) {
    console.error(e)
    ledgerCache.value[itemId] = []
  }
}

function toggleItem(itemId: number) {
  const s = new Set(expanded.value)
  if (s.has(itemId)) s.delete(itemId)
  else {
    s.add(itemId)
    loadLedgerIfNeeded(itemId)
  }
  expanded.value = s
}
function isExpanded(itemId: number) {
  return expanded.value.has(itemId)
}

/* ---------- computed ---------- */
const viewItems = computed(() => {
  const items = snap.value?.items ?? []
  const term = q.value.trim().toLowerCase()
  const filtered = term ? items.filter((it) => it.name.toLowerCase().includes(term)) : items
  return selItemId.value ? filtered.filter((it) => it.item_id === selItemId.value) : filtered
})

const totalShown = computed(() => viewItems.value.length)

onMounted(async () => {
  if (!itemsStore.items.length) await itemsStore.refresh()
  if (!locsStore.locations.length) await locsStore.refresh(true)
  await reasonsStore.ensureLoaded()
  users.value = await listUsersLite()

  selUserId.value = auth?.user_id ?? users.value[0]?.id ?? null
  await loadSnapshot()
})

watch([selUserId, asOfDate], loadSnapshot)
</script>

<template>
  <div class="p-4">
    <div class="head">
      <h2 class="title">Player Inventory</h2>
      <div class="actions">
        <BkSelect
          :items="users"
          v-model="selUserId"
          :getLabel="(u: any) => u.username"
          :getValue="(u: any) => u.id"
          placeholder="User"
        />
        <BkSelect
          :items="itemsStore.items"
          v-model="selItemId"
          :getLabel="(it: Item) => it.name"
          :getValue="(it: Item) => it.id"
          :getIconUrl="safeItemIcon"
          placeholder="Filter by item"
        />
        <input class="date" type="date" v-model="asOfDate" title="Valuation date (optional)" />
        <input class="search" v-model="q" type="search" placeholder="Search item…" />
      </div>
    </div>

    <div class="meta">{{ totalShown }} items shown</div>
    <div v-if="errorMsg" class="err">{{ errorMsg }}</div>

    <div class="card">
      <div class="table">
        <!-- Header -->
        <div class="tr th">
          <div class="cell exp"></div>
          <div class="cell item">Item</div>
          <div class="cell qty">Quantity</div>
          <div class="cell price" v-if="asOfDate">Price</div>
          <div class="cell value" v-if="asOfDate">Value</div>
        </div>

        <!-- Rows -->
        <template v-if="!loading && snap">
          <div v-for="it in viewItems" :key="it.item_id" class="group">
            <div class="tr row">
              <div class="cell exp">
                <button class="iconbtn" @click="toggleItem(it.item_id)">
                  <span class="caret" :class="{ open: isExpanded(it.item_id) }">▸</span>
                </button>
              </div>
              <div class="cell item">
                <img
                  :src="getItemIconUrl(it.item_id, itemsStore.iconBust[it.item_id])"
                  class="itm-icon"
                  alt=""
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
                {{ it.name }}
              </div>
              <div class="cell qty">{{ it.quantity }}</div>
              <div class="cell price" v-if="asOfDate">{{ it.price ?? '—' }}</div>
              <div class="cell value" v-if="asOfDate">{{ it.value ?? '—' }}</div>
            </div>

            <!-- Expanded: ledger for THIS item (filtered client-side) -->
            <div v-if="isExpanded(it.item_id)" class="expanded">
              <div class="tr th sub">
                <div class="cell exp"></div>
                <div class="cell ts">Timestamp</div>
                <div class="cell mv">Movement type</div>
                <div class="cell delta">Δ</div>
                <div class="cell tid">Trade</div>
              </div>

              <div v-for="ln in ledgerCache[it.item_id] || []" :key="ln.id" class="tr subrow">
                <div class="cell exp"></div>
                <div class="cell ts">{{ new Date(ln.timestamp).toLocaleString() }}</div>
                <div class="cell mv">
                  {{
                    reasonsStore.reasons.find((r) => r.code === ln.movement_reason_code)?.name ||
                    ln.movement_reason_code ||
                    '—'
                  }}
                </div>
                <div class="cell delta">
                  <span :class="ln.delta_qty >= 0 ? 'ok' : 'warn'">{{ ln.delta_qty }}</span>
                </div>
                <div class="cell tid">#{{ ln.trade_id ?? '—' }}</div>
              </div>

              <div v-if="!(ledgerCache[it.item_id] || []).length" class="loading">
                No ledger entries (or not loaded).
              </div>
            </div>
          </div>
        </template>

        <div v-if="loading" class="loading">Loading…</div>
      </div>

      <div v-if="asOfDate && snap" class="total">
        <span>Total value @ {{ asOfDate }}:</span>
        <strong>{{ snap.total_value ?? '—' }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table {
  --cols-main: 35px minmax(220px, 1.6fr) 120px 120px 140px;
}

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
  flex-wrap: wrap;
}

.search,
.date {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.meta {
  color: var(--text-muted, #8a92b2);
  margin-bottom: 8px;
}
.card {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 8px;
}
.table {
  width: 100%;
}

.tr {
  display: grid;
  grid-template-columns: var(--cols-main);
  gap: 8px;
  align-items: center;
  padding: 8px;
}
.th {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.row {
  background: var(--bg-secondary, #1d2238);
  border-radius: 8px;
}
.row:hover {
  background: var(--accent);
  transition: background 0.12s ease;
}

.expanded {
  margin: 4px 0 12px 40px;
  border-left: 2px solid rgba(255, 255, 255, 0.08);
  padding-left: 12px;
}
/* expanded: exp | ts | movement | delta | trade */
.tr.subrow,
.tr.th.sub {
  grid-template-columns: 35px minmax(160px, 1.2fr) minmax(180px, 1fr) 90px 90px;
}
.tr.subrow {
  background: var(--bg-tertiary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.iconbtn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
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

.itm-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  margin-right: 6px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.ok {
  color: #8ff0b2;
}
.warn {
  color: #ffb4b4;
}

.total {
  margin-top: 8px;
  padding: 10px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: 8px;
  align-items: baseline;
}
</style>
