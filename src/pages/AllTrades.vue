<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- eslint-disable @typescript-eslint/no-unused-expressions -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import BkSelect from '@/components/BkSelect.vue'

import { useItemsStore } from '@/stores/items'
import { useLocationsStore } from '@/stores/locations'
import { useMovementReasonsStore } from '../stores/movementReasons'
import { listTrades, type TradeOut, type TradeLineOut, deleteTradeLine } from '@/services/tradesApi'
import { useAuth } from '@/stores/auth'
import { getItemIconUrl } from '@/services/itemsApi'
import { listUsersLite, type UserLite } from '@/services/usersApi'
import type { Item } from '@/services/itemsApi'
import type { Location } from '@/services/locationsApi'

const auth = useAuth()
const scopeLabel = 'All Trades'

const router = useRouter()
const itemsStore = useItemsStore()
const locsStore = useLocationsStore()
const reasonsStore = useMovementReasonsStore()

const loading = ref(false)
const errorMsg = ref('')
const trades = ref<TradeOut[]>([])
const expanded = ref<Set<number>>(new Set())
const q = ref('') // search text

/* -------------------- Filters -------------------- */
const dateFrom = ref<string>('') // YYYY-MM-DD
const dateTo = ref<string>('') // YYYY-MM-DD
const selReason = ref<string | null>(null) // movement_reason_code
const selItemId = ref<number | null>(null)
// party filter
type PartyKind = 'any' | 'from_location' | 'to_location' | 'from_user' | 'to_user'
const partyKind = ref<PartyKind>('any')
const partyId = ref<number | null>(null)

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

function partyLabel(locId?: number | null, userId?: number | null) {
  if (userId != null) {
    const u = usersById.value[userId]
    return u ? u.username : `User #${userId}`
  }
  return locName(locId as any)
}

onMounted(async () => {
  loading.value = true
  try {
    if (itemsStore.items.length === 0) await itemsStore.refresh()
    if (locsStore.locations.length === 0) await locsStore.refresh(true)
    await reasonsStore.ensureLoaded()

    users.value = await listUsersLite()
    trades.value = await listTrades()
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Failed to load entries.'
  } finally {
    loading.value = false
  }
})

/* -------------------- helpers -------------------- */
function toggleRow(id: number) {
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
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
function userInitial(name?: string) {
  const n = (name || '').trim()
  return n ? n.charAt(0).toUpperCase() : 'U'
}

/* -------------------- Delete line -------------------- */
async function removeLine(t: TradeOut, ln: TradeLineOut & { direction: 'GAINED' | 'GIVEN' }) {
  if (!confirm(`Delete this line: ${ln.direction} ${ln.quantity} × ${itemName(ln.item_id)} ?`))
    return

  try {
    await deleteTradeLine(ln.id as unknown as number)
    const arr = ln.direction === 'GAINED' ? t.gained || [] : t.given || []
    const idx = arr.findIndex((x) => x.id === ln.id)
    if (idx >= 0) arr.splice(idx, 1)
    if ((t.gained?.length || 0) + (t.given?.length || 0) === 0) {
      const s = new Set(expanded.value)
      s.delete(t.id)
      expanded.value = s
      trades.value = trades.value.filter((x) => x.id !== t.id)
    }
  } catch (e) {
    console.error(e)
    alert('Failed to delete line.')
  }
}

/* -------------------- Search & Filters -------------------- */
function matchesSearch(t: TradeOut, s: string): boolean {
  const sIn = (v: unknown) =>
    String(v ?? '')
      .toLowerCase()
      .includes(s)
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
  for (const ln of mergedLines(t)) {
    const reasonName = reasonsStore.reasons.find(
      (r) => r.code === (ln as any).movement_reason_code,
    )?.name
    if (
      sIn(itemName(ln.item_id as any)) ||
      sIn(locName(ln.from_location_id as any)) ||
      sIn(locName(ln.to_location_id as any)) ||
      sIn((ln as any).direction) ||
      sIn(ln.quantity) ||
      sIn(reasonName) ||
      sIn((ln as any).movement_reason_code)
    )
      return true
  }
  return false
}

function withinDate(t: TradeOut) {
  if (!dateFrom.value && !dateTo.value) return true
  const ts = new Date(t.timestamp as any).getTime()
  if (dateFrom.value) {
    const min = new Date(dateFrom.value + 'T00:00:00').getTime()
    if (ts < min) return false
  }
  if (dateTo.value) {
    const max = new Date(dateTo.value + 'T23:59:59').getTime()
    if (ts > max) return false
  }
  return true
}
function hasReason(t: TradeOut) {
  if (!selReason.value) return true
  return mergedLines(t).some((ln) => (ln as any).movement_reason_code === selReason.value)
}
function hasItem(t: TradeOut) {
  if (!selItemId.value) return true
  return mergedLines(t).some((ln) => ln.item_id === selItemId.value)
}
function hasParty(t: TradeOut) {
  if (partyKind.value === 'any' || !partyId.value) return true
  const lines = mergedLines(t)
  switch (partyKind.value) {
    case 'from_location':
      return lines.some((ln) => (ln as any).from_location_id === partyId.value)
    case 'to_location':
      return lines.some((ln) => (ln as any).to_location_id === partyId.value)
    case 'from_user':
      return lines.some((ln) => (ln as any).from_user_id === partyId.value)
    case 'to_user':
      return lines.some((ln) => (ln as any).to_user_id === partyId.value)
  }
}

const viewTrades = computed(() => {
  const s = q.value.trim().toLowerCase()
  return trades.value
    .filter(withinDate)
    .filter(hasReason)
    .filter(hasItem)
    .filter(hasParty)
    .filter((t) => !s || matchesSearch(t, s))
})
const totalShown = computed(() => viewTrades.value.length)

/* -------------------- Duplicate (prefill Create Trade) -------------------- */
function duplicateTrade(t: TradeOut) {
  // Build draft for CreateTrade: use current time, keep header locations
  const draft = {
    timestamp: new Date().toISOString(),
    from_location_id: t.from_location_id ?? undefined,
    to_location_id: t.to_location_id ?? undefined,
    lines: mergedLines(t).map((ln) => ({
      item_id: ln.item_id,
      direction: (ln as any).direction, // 'GAINED' | 'GIVEN'
      quantity: ln.quantity,
      movement_reason_code: (ln as any).movement_reason_code ?? null,
      from_location_id: (ln as any).from_location_id ?? null,
      to_location_id: (ln as any).to_location_id ?? null,
      from_user_id: (ln as any).from_user_id ?? null,
      to_user_id: (ln as any).to_user_id ?? null,
    })),
  }
  sessionStorage.setItem('bk_trade_draft', JSON.stringify(draft))
  router.push({ path: '/create-trade' }) // adjust if your route differs
}
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="head gap-3">
      <h1 class="text-xl">All Entries</h1>
      <div class="px-2 py-1 text-xs rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
        Scope: {{ scopeLabel }}
      </div>
      <div class="ml-auto"></div>
      <!-- Search + Filters -->
      <div class="actions">
        <input
          v-model="q"
          class="search"
          type="search"
          placeholder="Search by user, ID, item, location, reason, direction…"
        />
        <input class="date" type="date" v-model="dateFrom" title="From date" />
        <input class="date" type="date" v-model="dateTo" title="To date" />

        <BkSelect
          :items="reasonsStore.reasons"
          v-model="selReason"
          :getLabel="(r: any) => r.name"
          :getValue="(r: any) => r.code"
          placeholder="Reason"
        />
        <BkSelect
          :items="itemsStore.items"
          v-model="selItemId"
          :getLabel="(it: Item) => it.name"
          :getValue="(it: Item) => it.id"
          :getIconUrl="safeItemIcon"
          placeholder="Item"
        />

        <BkSelect
          :items="[
            { label: 'Party: Any', value: 'any' },
            { label: 'From Location', value: 'from_location' },
            { label: 'To Location', value: 'to_location' },
            { label: 'From User', value: 'from_user' },
            { label: 'To User', value: 'to_user' },
          ]"
          v-model="partyKind"
          :getLabel="(x: any) => x.label"
          :getValue="(x: any) => x.value"
          placeholder="Party"
        />
        <BkSelect
          v-if="partyKind === 'from_location' || partyKind === 'to_location'"
          :items="locsStore.locations"
          v-model="partyId"
          :getLabel="(loc: Location) => loc.name"
          :getValue="(loc: Location) => loc.id"
          placeholder="Select location…"
        />
        <BkSelect
          v-else-if="partyKind === 'from_user' || partyKind === 'to_user'"
          :items="[
            /* lightweight: use usernames from trades list */ ...new Map(
              viewTrades.map((t) => [t.user_id, { id: t.user_id, username: t.username }]),
            ).values(),
          ]"
          v-model="partyId"
          :getLabel="(u: any) => u.username"
          :getValue="(u: any) => u.id"
          placeholder="Select user…"
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
          <div class="cell act"></div>
        </div>

        <!-- Rows -->
        <template v-if="!loading">
          <div v-for="t in viewTrades" :key="t.id" class="group">
            <!-- Collapsed summary -->
            <div class="tr row">
              <div class="cell exp">
                <button class="iconbtn" @click="toggleRow(t.id)">
                  <span class="caret" :class="{ open: isExpanded(t.id) }">▸</span>
                </button>
              </div>

              <div class="cell id">#{{ t.id }}</div>
              <div class="cell ts">{{ fmtDate(t.timestamp as any) }}</div>
              <div class="cell user">
                <span class="avatar">{{ userInitial(t.username) }}</span>
                <span class="uname">{{ t.username }}</span>
                <span class="uid">(#{{ t.user_id }})</span>
              </div>
              <div class="cell from">{{ locName(t.from_location_id as any) }}</div>
              <div class="cell to">{{ locName(t.to_location_id as any) }}</div>
              <div class="cell lines">{{ lineCount(t) }}</div>
              <div class="cell profit">{{ t.profit ?? '—' }}</div>

              <div class="cell act">
                <button class="btn" @click="duplicateTrade(t)">Duplicate</button>
              </div>
            </div>

            <!-- Expanded: exact tradelines -->
            <div v-if="isExpanded(t.id)" class="expanded">
              <div class="tr th sub">
                <div class="cell exp"></div>
                <div class="cell item">Item</div>
                <div class="cell reason">Movement type</div>
                <div class="cell qty">Qty</div>
                <div class="cell from">From (line)</div>
                <div class="cell to">To (line)</div>
                <div class="cell profit"></div>
                <div class="cell act">Actions</div>
              </div>

              <div class="tr subrow" v-for="(ln, idx) in mergedLines(t)" :key="idx">
                <div class="cell exp"></div>

                <div class="cell item">
                  <img
                    :src="getItemIconUrl(ln.item_id, itemsStore.iconBust[ln.item_id])"
                    class="itm-icon"
                    alt=""
                    @error="($event.target as HTMLImageElement).style.display = 'none'"
                  />
                  {{ itemName(ln.item_id as any) }}
                </div>

                <!-- Movement type -->
                <div class="cell reason">
                  {{
                    reasonsStore.reasons.find((r) => r.code === (ln as any).movement_reason_code)
                      ?.name ||
                    (ln as any).movement_reason_code ||
                    '—'
                  }}
                </div>

                <div class="cell qty">{{ ln.quantity }}</div>

                <!-- Party labels: show user when present, otherwise location -->
                <div class="cell from">
                  {{ partyLabel((ln as any).from_location_id, (ln as any).from_user_id) }}
                </div>
                <div class="cell to">
                  {{ partyLabel((ln as any).to_location_id, (ln as any).to_user_id) }}
                </div>

                <div class="cell profit"></div>

                <div class="cell act">
                  <button class="btn danger" @click.stop="removeLine(t, ln)">Delete</button>
                </div>
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
.table {
  --cols-main: 35px minmax(64px, 0.6fr) minmax(140px, 1fr) minmax(160px, 1.1fr) minmax(160px, 1fr)
    minmax(160px, 1fr) 90px 96px 110px;
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

.search {
  min-width: 220px;
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
.date {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  background: var(--bg-tertiary);
  color: var(--text-primary);
  outline: none;
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
.tr.subrow,
.tr.th.sub {
  grid-template-columns: 35px 1.3fr 1.2fr 0.7fr 1.2fr 1.2fr 0.8fr 110px;
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
.cell.act {
  text-align: right;
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

.avatar {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  background: #2b2f55;
  color: #cfe3ff;
  margin-right: 6px;
}
.uname {
  margin-right: 6px;
}
.uid {
  color: var(--text-muted);
}

.chip {
  padding: 0 8px;
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

.itm-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  margin-right: 6px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.loading {
  padding: 16px;
  color: var(--text-muted, #8a92b2);
}
.err {
  color: #ff9494;
  margin-bottom: 8px;
}

.btn {
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  cursor: pointer;
}
.btn.danger {
  background: #5a2323;
  border-color: #7a2b2b;
}
.btn.danger:hover {
  filter: brightness(1.05);
}
</style>
