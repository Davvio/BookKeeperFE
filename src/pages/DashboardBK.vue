<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from '@/stores/auth'
import { listTrades, type TradeOut } from '@/services/tradesApi'
import {
  getInventorySummary,
  getInventoryByLocation,
  type LocationSummaryRow,
} from '@/services/inventoryApi'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

/** ---------- Auth / toggles ---------- */
const auth = useAuth()
const isAdmin = computed(() =>
  Boolean(
    (auth as any)?.permissions?.['users.admin'] ||
      (auth as any)?.user?.permissions?.['users.admin'],
  ),
)
const mineOnly = ref(true) // players see their own; admins can flip
const includeExternal = ref(false) // net worth excludes Import/Export by default
const asOf = ref(new Date().toISOString())

const locSummary = ref<LocationSummaryRow[]>([])
const distRef = ref<HTMLCanvasElement | null>(null)
let distChart: Chart | null = null

/** datetime-local bridge */
const asOfLocal = computed({
  get() {
    const d = new Date(asOf.value)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  },
  set(v: string) {
    asOf.value = new Date(v).toISOString()
  },
})

/** ---------- Data ---------- */
const loading = ref(false)
const errorMsg = ref('')
const trades = ref<TradeOut[]>([])
const grandTotal = ref(0)
const invRows = ref<
  { item_id: number; item_name: string; qty: number; unit_value: number; total_value: number }[]
>([])

/** ---------- Helpers ---------- */
function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function toLocalDay(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** ---------- Load ---------- */
async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [ts, inv] = await Promise.all([
      listTrades(),
      getInventorySummary({
        as_of: asOf.value,
        include_external: includeExternal.value,
        show_zero: false,
      }),
    ])

    locSummary.value = await getInventoryByLocation({
      as_of: asOf.value,
      include_external: false,
    })
    const myUsername = (auth as any)?.username || (auth as any)?.user?.username
    const canSeeAll = Boolean((auth as any)?.permissions?.['trades.view_all'])

    trades.value =
      mineOnly.value || !canSeeAll ? ts.filter((t) => t.username === myUsername) : ts.slice()

    trades.value.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    invRows.value = inv.rows
    grandTotal.value = inv.grand_total_value

    drawAll()
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Failed to load dashboard data.'
  } finally {
    loading.value = false
  }
}

/** ---------- Chart.js theme (dark) ---------- */
Chart.defaults.borderColor = 'rgba(255,255,255,0.15)'
Chart.defaults.font.family = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

/** ---------- Refs for canvases + charts ---------- */
const netWorthRef = ref<HTMLCanvasElement | null>(null)
const topItemsRef = ref<HTMLCanvasElement | null>(null)
const activityRef = ref<HTMLCanvasElement | null>(null)
let netWorthChart: Chart | null = null
let topItemsChart: Chart | null = null
let activityChart: Chart | null = null

function upsertChart(
  inst: Chart | null,
  el: HTMLCanvasElement | null,
  type: 'line' | 'bar' | 'doughnut',
  data: any,
  options: any,
): Chart | null {
  try {
    if (!el) return inst
    if (inst) {
      inst.data = data
      inst.options = options
      inst.update()
      return inst
    }
    return new Chart(el.getContext('2d')!, { type, data, options })
  } catch (e) {
    console.error('Chart error:', e)
    return inst
  }
}

/** ---------- Build datasets ---------- */
// 1) Net worth over time (cumulative profit by day)
const netWorthData = computed(() => {
  const perDay = new Map<string, number>()
  for (const t of trades.value) {
    const day = toLocalDay(t.timestamp as any)
    const p = Number(t.profit ?? 0)
    perDay.set(day, (perDay.get(day) || 0) + p)
  }
  const days = Array.from(perDay.keys()).sort()
  const values: number[] = []
  let acc = 0
  for (const d of days) {
    acc += perDay.get(d) || 0
    values.push(Number(acc.toFixed(2)))
  }
  return { labels: days, values }
})

// 2) Top items by current value (bar)
const topItemsData = computed(() => {
  const rows = invRows.value
    .filter((r) => r.qty !== 0)
    .sort((a, b) => Math.abs(b.total_value) - Math.abs(a.total_value))
    .slice(0, 7)
  return {
    labels: rows.map((r) => r.item_name),
    values: rows.map((r) => Number(r.total_value.toFixed(2))),
  }
})

// 3) Activity by hour (bar)
const activityData = computed(() => {
  const buckets = new Array(24).fill(0)
  for (const t of trades.value) {
    const d = new Date(t.timestamp as any)
    buckets[d.getHours()]++
  }
  return { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), values: buckets }
})

const distData = computed(() => {
  const rows = locSummary.value
    .filter((r) => !r.is_external && Math.abs(r.total_value) > 0)
    .sort((a, b) => Math.abs(b.total_value) - Math.abs(a.total_value))
    .slice(0, 10) // top 10 slices (change as you like)

  return {
    labels: rows.map((r) => r.location_name),
    values: rows.map((r) => Number(r.total_value.toFixed(2))),
  }
})

/** ---------- Draw ---------- */
function makePalette(n: number): string[] {
  const base = [
    '#5c6ac4',
    '#7280ff',
    '#8a9aff',
    '#7aa2f7',
    '#52c7ea',
    '#7bd3ff',
    '#6fb1c6',
    '#5f9ea0',
    '#7c6fd6',
    '#9b7bdc',
    '#b28fe6',
    '#8aa2ff',
  ]
  const out: string[] = []
  for (let i = 0; i < n; i++) out.push(base[i % base.length])
  return out
}

function drawAll() {
  const styles = getComputedStyle(document.documentElement)
  const accent = styles.getPropertyValue('--accent')?.trim() || '#5c6ac4'
  const fg = styles.getPropertyValue('--text-primary')?.trim() || '#ffffff'
  const grid = 'rgba(255,255,255,0.12)'
  Chart.defaults.color = fg

  const nw = netWorthData.value
  netWorthChart = upsertChart(
    netWorthChart,
    netWorthRef.value,
    'line',
    {
      labels: nw.labels,
      datasets: [
        {
          label: 'Cumulative Profit',
          data: nw.values,
          borderWidth: 2,
          borderColor: accent,
          pointRadius: 0,
          fill: false,
          tension: 0.25,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c: any) => ` ${fmtMoney(c.parsed.y)}` } },
      },
      scales: {
        x: { grid: { color: grid } },
        y: { grid: { color: grid }, ticks: { callback: (v: any) => fmtMoney(Number(v)) } },
      },
    },
  )

  const ti = topItemsData.value
  topItemsChart = upsertChart(
    topItemsChart,
    topItemsRef.value,
    'bar',
    {
      labels: ti.labels,
      datasets: [
        {
          label: 'Value',
          data: ti.values,
          backgroundColor: accent,
        },
      ],
    },
    {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c: any) => ` ${fmtMoney(c.parsed.x)}` } },
      },
      scales: {
        x: { grid: { color: grid }, ticks: { callback: (v: any) => fmtMoney(Number(v)) } },
        y: { grid: { display: false } },
      },
    },
  )

  const act = activityData.value
  activityChart = upsertChart(
    activityChart,
    activityRef.value,
    'bar',
    {
      labels: act.labels,
      datasets: [
        {
          label: 'Trades',
          data: act.values,
          backgroundColor: fg,
          borderWidth: 0,
        },
      ],
    },
    {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: grid } },
        y: { grid: { color: grid }, ticks: { precision: 0 } },
      },
    },
  )

  const dd = distData.value
  distChart = upsertChart(
    distChart,
    distRef.value,
    'doughnut',
    {
      labels: dd.labels,
      datasets: [
        {
          data: dd.values,
          backgroundColor: makePalette(dd.values.length),
          borderWidth: 0,
        },
      ],
    },
    {
      cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (c: any) => ` ${c.label}: ${fmtMoney(c.parsed)}`,
          },
        },
      },
    },
  )
}

/** ---------- Lifecycle ---------- */
onMounted(load)
watch([mineOnly, includeExternal, asOf], load)
onUnmounted(() => {
  netWorthChart?.destroy()
  topItemsChart?.destroy()
  activityChart?.destroy()
  distChart?.destroy()
})
</script>

<template>
  <div class="p-4">
    <div class="head">
      <h2 class="title">Dashboard</h2>
      <div class="filters">
        <label class="ctrl">
          <input type="checkbox" v-model="mineOnly" />
          <span>Mine only</span>
        </label>
        <label class="ctrl">
          <input type="checkbox" v-model="includeExternal" />
          <span>Include external (Import/Export)</span>
        </label>
        <label class="ctrl">
          <span>As of</span>
          <input type="datetime-local" v-model="asOfLocal" />
        </label>
        <button class="btn" @click="load">Refresh</button>
      </div>
    </div>

    <div v-if="errorMsg" class="err">{{ errorMsg }}</div>

    <div class="kpis">
      <div class="kpi">
        <div class="label">Net Worth (as of)</div>
        <div class="value">{{ fmtMoney(grandTotal) }}</div>
      </div>
      <div class="kpi">
        <div class="label">Total Trades</div>
        <div class="value">{{ trades.length.toLocaleString() }}</div>
      </div>
      <div class="kpi">
        <div class="label">Active Items</div>
        <div class="value">{{ invRows.length.toLocaleString() }}</div>
      </div>
    </div>

    <div class="grid charts-70">
      <div class="card chart">
        <div class="card-title">Cumulative Profit</div>
        <canvas ref="netWorthRef"></canvas>
      </div>

      <div class="card chart">
        <div class="card-title">Top Holdings by Value</div>
        <canvas ref="topItemsRef"></canvas>
      </div>

      <div class="card chart">
        <div class="card-title">Activity by Hour</div>
        <canvas ref="activityRef"></canvas>
      </div>
      <div class="card chart">
        <div class="card-title">Value by Location (Internal)</div>
        <canvas ref="distRef"></canvas>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading…</div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.title {
  font-size: 1.25rem;
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

.kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}
.kpi {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.kpi .label {
  font-size: 0.85rem;
  color: var(--text-muted);
}
.kpi .value {
  font-size: 1.25rem;
  font-weight: 700;
}

.grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}
@media (min-width: 960px) {
  .grid {
    grid-template-columns: 1.2fr 1fr;
  }
}
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.card-title {
  margin-bottom: 6px;
  color: var(--text-muted);
}

.loading {
  padding: 16px;
  color: var(--text-muted);
}
.err {
  color: #ff9494;
  margin-bottom: 8px;
}

/* make the charts section only 70% wide, centered */
.grid.charts-70 {
  width: 70%;
  margin-inline: auto;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, 1fr);
}

/* on small screens, stack */
@media (max-width: 960px) {
  .grid.charts-70 {
    width: 100%;
    grid-template-columns: 1fr;
  }
}

/* each chart card occupies its grid cell and provides height for the canvas */
.card.chart {
  display: flex;
  flex-direction: column;
  /* choose one of these height strategies */

  /* A) square cards */
  aspect-ratio: 1 / 1;

  /* OR B) 16:9 cards (comment A and use this) */
  /* aspect-ratio: 16 / 9; */

  min-height: 220px; /* guard for short viewports */
}

/* let the canvas fill the remaining space */
.card.chart .card-title {
  margin-bottom: 6px;
}
</style>
