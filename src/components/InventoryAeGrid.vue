<script setup lang="ts">
import { computed, ref } from 'vue'
import type { InventoryItemRow } from '@/services/inventoryApi'
import { useItemsStore } from '@/stores/items'
import { getItemIconUrl } from '@/services/itemsApi'

const props = defineProps<{ rows: InventoryItemRow[] }>()

const itemsStore = useItemsStore()
const fallback = ref<Record<number, boolean>>({})

function shortQty(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0) + 'b'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + 'm'
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 ? 1 : 0) + 'k'
  return String(n)
}

const tiles = computed(() =>
  props.rows.map((r) => ({
    id: r.item_id,
    title: `${r.item_name} — ${r.qty.toLocaleString()}`,
    qtyShort: shortQty(r.qty),
    icon: getItemIconUrl(r.item_id, itemsStore.iconBust[r.item_id]),
  })),
)

function onImgError(id: number, ev: Event) {
  if (fallback.value[id]) return
  ;(ev.target as HTMLImageElement).src = '/assets/mc-icons/_fallback.png'
  fallback.value[id] = true
}
</script>

<template>
  <div class="ae-wrap">
    <div class="ae-grid">
      <button v-for="t in tiles" :key="t.id" class="tile" :title="t.title" type="button">
        <img
          :src="t.icon"
          alt=""
          class="tile__img"
          loading="lazy"
          @error="onImgError(t.id, $event)"
        />
        <span class="tile__qty">{{ t.qtyShort }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 70% of available width, centered */
.ae-wrap {
  width: 70%;
  margin-left: auto;
  margin-right: auto;
}

/* Max 9 items per row; additional items wrap to new rows */
.ae-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr); /* never more than 9 columns */
  gap: 10px;
  justify-items: center; /* center tiles inside each column track */
}

/* Tile keeps a square shape that scales with the column width */
.tile {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  display: grid;
  place-items: center;
  overflow: hidden;
  cursor: default;
}
.tile:hover {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.tile__img {
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
  pointer-events: none;
}

.tile__qty {
  position: absolute;
  right: 6px;
  bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 4px;
  border-radius: 6px;
}
</style>
