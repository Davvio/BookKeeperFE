<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useToast } from '@/stores/toast'
import { useAuth } from '@/stores/auth'
// API wrappers – adjust import paths if different
import { listLocations, createLocation, deleteLocation } from '../services/locationsApi'

type LocationType = 'TOWN' | 'OUTPOST' | 'MINE' | 'PORT' | 'OTHER'
type LocationOut = {
  id: number
  name: string
  code?: string | null
  type: LocationType
  x?: number | null
  y?: number | null
  z?: number | null
  is_active: boolean
}

const toast = useToast()
const auth = useAuth()

// Gate: Quartermaster/Admin can manage; employees view-only
const canManage = computed(() => {
  try {
    const json = JSON.parse(atob((auth.token || '').split('.')[1] || '')) || {}
    const p = json.permissions || {}
    return !!(p['locations.manage'] || p['users.admin'])
  } catch {
    return false
  }
})

const loading = ref(false)
const q = ref('')
const type = ref<LocationType | 'ALL'>('ALL')
const activeOnly = ref(true)
const rows = ref<LocationOut[]>([])

async function load() {
  loading.value = true
  try {
    // If your API supports server filters, pass q/type/active here; else we filter client-side:
    rows.value = await listLocations()
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (activeOnly.value && !r.is_active) return false
    if (type.value !== 'ALL' && r.type !== type.value) return false
    if (term && !`${r.name} ${r.code || ''}`.toLowerCase().includes(term)) return false
    return true
  })
})

// Create drawer
const showCreate = ref(false)
const form = ref<{
  name: string
  code: string
  type: LocationType
  x?: number | null
  y?: number | null
  z?: number | null
  is_active: boolean
}>({
  name: '',
  code: '',
  type: 'OTHER',
  x: null,
  y: null,
  z: null,
  is_active: true,
})
function openCreate() {
  form.value = { name: '', code: '', type: 'OTHER', x: null, y: null, z: null, is_active: true }
  showCreate.value = true
}
async function submitCreate() {
  if (!form.value.name.trim()) return
  try {
    await createLocation({
      name: form.value.name.trim(),
      code: form.value.code?.trim() || null,
      type: form.value.type,
      x: form.value.x ?? null,
      y: form.value.y ?? null,
      z: form.value.z ?? null,
      is_active: form.value.is_active,
    })
    showCreate.value = false
    toast.push('Location created', 'success')
    await load()
  } catch (e: any) {
    toast.push(e?.response?.data?.detail || 'Failed to create location', 'error', 4000)
  }
}

// Delete flow
const confirmOpen = ref(false)
const toDelete = ref<LocationOut | null>(null)
function askDelete(row: LocationOut) {
  toDelete.value = row
  confirmOpen.value = true
}
async function doDelete() {
  if (!toDelete.value) return
  try {
    await deleteLocation(toDelete.value.id)
    toast.push('Location deleted', 'success')
    confirmOpen.value = false
    toDelete.value = null
    await load()
  } catch (e: any) {
    toast.push(e?.response?.data?.detail || 'Delete failed', 'error', 4000)
  }
}

// Treat 'Unknown location' as protected from deletion if its name exactly matches
function isUnknown(r: LocationOut) {
  return (r.name || '').toLowerCase() === 'unknown location'
}
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 items-center">
      <input
        v-model="q"
        placeholder="Search name or code…"
        class="w-[min(360px,100%)] px-3 py-2 rounded-md bg-[var(--bg-tertiary)] outline-none"
      />
      <select v-model="type" class="px-2 py-2 rounded bg-[var(--bg-tertiary)]">
        <option value="ALL">All types</option>
        <option value="TOWN">TOWN</option>
        <option value="OUTPOST">OUTPOST</option>
        <option value="MINE">MINE</option>
        <option value="PORT">PORT</option>
        <option value="OTHER">OTHER</option>
      </select>
      <label class="flex items-center gap-2 text-sm opacity-90 ml-auto">
        <input type="checkbox" v-model="activeOnly" /> Active only
      </label>
      <button
        v-if="canManage"
        class="px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg-primary)]"
        @click="openCreate"
      >
        + New
      </button>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-[var(--bg-secondary)] p-2 overflow-auto">
      <table class="w-full text-sm">
        <thead class="text-left text-[var(--text-muted)]">
          <tr>
            <th class="px-3 py-2">Name</th>
            <th class="px-3 py-2">Code</th>
            <th class="px-3 py-2">Type</th>
            <th class="px-3 py-2">X</th>
            <th class="px-3 py-2">Y</th>
            <th class="px-3 py-2">Z</th>
            <th class="px-3 py-2">Active</th>
            <th class="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="px-3 py-6 text-center text-sm opacity-70">Loading…</td>
          </tr>
          <tr v-else-if="!filtered.length">
            <td colspan="8" class="px-3 py-6 text-center text-sm opacity-70">
              No locations found.
            </td>
          </tr>
          <tr v-for="r in filtered" :key="r.id" class="border-t border-[var(--border-subtle)]">
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ r.name }}</span>
                <span
                  v-if="isUnknown(r)"
                  class="text-[10px] px-2 py-0.5 rounded bg-[var(--accent-tint)]"
                  >unknown</span
                >
              </div>
            </td>
            <td class="px-3 py-2">{{ r.code || '—' }}</td>
            <td class="px-3 py-2">{{ r.type }}</td>
            <td class="px-3 py-2">{{ r.x ?? '—' }}</td>
            <td class="px-3 py-2">{{ r.y ?? '—' }}</td>
            <td class="px-3 py-2">{{ r.z ?? '—' }}</td>
            <td class="px-3 py-2">
              <span :class="r.is_active ? 'text-green-400' : 'text-red-400'">{{
                r.is_active ? 'Yes' : 'No'
              }}</span>
            </td>
            <td class="px-3 py-2">
              <!-- Edit hidden until PUT exists -->
              <button
                class="px-2 py-1 rounded bg-[var(--bg-tertiary)] opacity-50 cursor-not-allowed"
                title="Edit coming soon"
              >
                Edit
              </button>
              <button
                v-if="canManage"
                class="ml-2 px-2 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                :disabled="isUnknown(r) || true"
                @click="askDelete(r)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Drawer (simple modal card for now) -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/55" @click="showCreate = false" />
      <div
        class="relative w-[min(640px,94vw)] p-4 rounded-xl bg-[var(--bg-secondary)] shadow-[var(--panel-shadow)]"
      >
        <div class="text-lg font-medium mb-3">New Location</div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">Name</label>
            <input
              v-model="form.name"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
            />
          </div>
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">Code</label>
            <input
              v-model="form.code"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
            />
          </div>
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">Type</label>
            <select v-model="form.type" class="w-full px-2 py-2 rounded bg-[var(--bg-tertiary)]">
              <option value="TOWN">TOWN</option>
              <option value="OUTPOST">OUTPOST</option>
              <option value="MINE">MINE</option>
              <option value="PORT">PORT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">Active</label>
            <select
              v-model="form.is_active"
              class="w-full px-2 py-2 rounded bg-[var(--bg-tertiary)]"
            >
              <option :value="true">Yes</option>
              <option :value="false">No</option>
            </select>
          </div>
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">X</label>
            <input
              v-model.number="form.x"
              type="number"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
            />
          </div>
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">Y</label>
            <input
              v-model.number="form.y"
              type="number"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
            />
          </div>
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">Z</label>
            <input
              v-model.number="form.z"
              type="number"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
            />
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button class="px-3 py-2 rounded bg-[var(--bg-tertiary)]" @click="showCreate = false">
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg-primary)]"
            @click="submitCreate"
          >
            Create
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <ConfirmDialog
      :open="confirmOpen"
      title="Delete location"
      :message="
        toDelete
          ? `This will permanently delete the location.\nType its exact name to confirm: ${toDelete.name}`
          : ''
      "
      :requireText="toDelete?.name"
      confirmLabel="Delete"
      @close="confirmOpen = false"
      @confirm="doDelete"
    />
  </div>
</template>
