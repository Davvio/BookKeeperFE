<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- src/pages/MinecraftMap.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import L, { Map as LMap, ImageOverlay, LatLng, LayerGroup, Marker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { usePositions } from '@/stores/positions'
import { useAuth } from '@/stores/auth'

const auth = useAuth()
const positions = usePositions()

// Refs
const mapEl = ref<HTMLDivElement | null>(null)
let map: LMap | null = null
let imgOverlay: ImageOverlay | null = null
let markersLayer: LayerGroup | null = null

// Image config
const imageUrl = String(import.meta.env.VITE_MAP_IMAGE_URL || '/maps/BetaMap.png')
const zPositiveDown = positions.isZPositiveDown

// runtime size from image
const imgW = ref<number>(0)
const imgH = ref<number>(0)

// UI
const search = computed({
  get: () => positions.q,
  set: (v: string) => (positions.q = v),
})
const onlineOnly = computed({
  get: () => positions.onlineOnly,
  set: (v: boolean) => (positions.onlineOnly = v),
})

function latLngFromXZ(x: number, z: number): LatLng {
  // CRS.Simple: lat = Y pixels (down positive), lng = X pixels (right positive)
  // Origin is image center (0,0) at (imgW/2, imgH/2). Scale: 1 px = 1 block.
  const xPx = imgW.value / 2 + x
  const yPx = imgH.value / 2 + (zPositiveDown ? z : -z)
  return L.latLng(yPx, xPx)
}

function buildMarkerHtml(username: string) {
  const imgSrc = '/images/steve-head.png' // provide your PNG in /public/images
  // minimal markup; style via CSS below
  return (
    '<div class="mc-pin">' +
    '<img class="mc-face" src="' +
    imgSrc +
    '" alt="head" />' +
    '<div class="mc-name">' +
    username.replace(/</g, '&lt;') +
    '</div>' +
    '</div>'
  )
}

function rebuildMarkers() {
  if (!map || !markersLayer) return
  markersLayer.clearLayers()

  const arr = positions.filteredPlayers
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i]
    const latlng = latLngFromXZ(p.x, p.z)
    const divIcon = L.divIcon({
      className: 'mc-divicon',
      html: buildMarkerHtml(p.username),
      iconSize: [48, 48], // footprint
      iconAnchor: [24, 40], // point above bottom center
    })
    const m = L.marker(latlng, { icon: divIcon })
    const ageSec = Math.floor((Date.now() - Date.parse(p.ts)) / 1000)
    const info =
      '<b>' +
      p.username +
      '</b><br/>x:' +
      Math.round(p.x) +
      ' y:' +
      Math.round(p.y) +
      ' z:' +
      Math.round(p.z) +
      '<br/>last: ' +
      ageSec +
      's ago' +
      (p.user_id !== null ? '<br/><i>linked user #' + p.user_id + '</i>' : '<br/><i>unlinked</i>')
    m.bindTooltip(info, { direction: 'top', offset: L.point(0, -38) })
    markersLayer.addLayer(m as unknown as L.Layer)
  }
}

function initMap() {
  if (!mapEl.value) return
  map = L.map(mapEl.value, {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 3,
    zoomControl: true,
  })
  markersLayer = L.layerGroup().addTo(map)

  // Load image to get dimensions, then set overlay + view
  const img = new Image()
  img.onload = () => {
    imgW.value = img.naturalWidth
    imgH.value = img.naturalHeight

    const southWest = L.latLng(0, 0)
    const northEast = L.latLng(imgH.value, imgW.value)
    const bounds = L.latLngBounds(southWest, northEast)

    imgOverlay = L.imageOverlay(imageUrl, bounds).addTo(map as LMap)
    ;(map as LMap).fitBounds(bounds)
    ;(map as LMap).setMaxBounds(bounds.pad(0.1))
    rebuildMarkers()
  }
  img.src = imageUrl
}

onMounted(async () => {
  // guard: admin-only; if somehow routed without perm, just bail
  if (!auth.can('users.admin')) return
  initMap()
  await positions.init() // loads mapping + starts polling
})

onBeforeUnmount(() => {
  positions.stop()
  positions.clear()
  if (map) {
    map.remove()
    map = null
  }
})
watch(
  () => positions.lastUpdateAt,
  () => {
    rebuildMarkers()
  },
)
watch(
  () => positions.onlineOnly,
  () => {
    rebuildMarkers()
  },
)
watch(
  () => positions.q,
  () => {
    rebuildMarkers()
  },
)
</script>

<template>
  <div class="flex h-full">
    <!-- Map -->
    <div class="flex-1 h-full">
      <div ref="mapEl" class="h-full w-full"></div>
    </div>

    <!-- Side panel -->
    <aside class="w-80 border-l border-[var(--bg-tertiary)] p-4 space-y-4 bg-[var(--bg-secondary)]">
      <div class="text-lg font-semibold">Minecraft Map</div>

      <div class="text-sm opacity-80">
        Status:
        <span v-if="positions.status === 'open'">Connected</span>
        <span v-else-if="positions.status === 'connecting'">Connecting…</span>
        <span v-else>Idle</span>
      </div>

      <div class="space-y-2">
        <label class="text-sm block">Search player</label>
        <input
          class="w-full px-3 py-2 rounded border border-[var(--bg-tertiary)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
          placeholder="Type a username…"
          :value="search"
          @input="search = ($event.target as HTMLInputElement).value"
        />
      </div>

      <label class="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          :checked="onlineOnly"
          @change="onlineOnly = ($event.target as HTMLInputElement).checked"
        />
        Online only ({{ positions.recentThresholdSec }}s)
      </label>

      <div class="text-sm opacity-80">Visible: {{ positions.onlineCount }}</div>

      <div class="text-xs opacity-60">
        • 1 px = 1 block, origin = image center.<br />
        • Showing only players mapped to your structure.
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* Marker visuals */
.mc-divicon {
  background: transparent;
}
.mc-pin {
  position: relative;
  display: inline-block;
  transform: translateY(-6px);
}
.mc-face {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  display: block;
  margin: 0 auto;
}
.mc-name {
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 6px;
  font-size: 11px;
  line-height: 1;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
}
</style>
