<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- src/pages/old/AdminMovementReasons.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/stores/toast'
import { useAuth } from '@/stores/auth'
import {
  listMovementReasons,
  createMovementReason,
  updateMovementReason,
  type MovementReason,
  type MovementReasonIn,
} from '@/services/movementReasonsApi'

const toast = useToast()
const auth = useAuth()

const canManage = computed(() => {
  try {
    const json = JSON.parse(atob((auth.token || '').split('.')[1] || '')) || {}
    const p = json.permissions || {}
    // BE also checks movement_reasons.manage; UI gate helps UX
    return !!(p['movement_reasons.manage'] || p['users.admin'])
  } catch {
    return false
  }
})

const loading = ref(false)
const q = ref('')
const onlyActive = ref(false)

const rows = ref<MovementReason[]>([])
const edits = ref<Array<MovementReasonIn & { __origCode: string }>>([])

async function load() {
  loading.value = true
  try {
    rows.value = await listMovementReasons(!onlyActive.value ? undefined : true)
    // build editable copies; keep original path code in __origCode
    edits.value = rows.value.map((r) => ({
      __origCode: r.code,
      code: r.code,
      name: r.name,
      is_active: r.is_active,
    }))
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return edits.value
  return edits.value.filter((e) => `${e.code} ${e.name}`.toLowerCase().includes(term))
})

function isChanged(e: MovementReasonIn & { __origCode: string }) {
  const orig = rows.value.find((r) => r.code === e.__origCode)
  if (!orig) return true
  return orig.code !== e.code || orig.name !== e.name || orig.is_active !== e.is_active
}

async function saveRow(e: MovementReasonIn & { __origCode: string }) {
  if (!canManage.value) return
  if (!e.code.trim() || !e.name.trim()) {
    toast.push('Code and Name are required', 'error', 3000)
    return
  }
  try {
    const saved = await updateMovementReason(e.__origCode, {
      code: e.code.trim(),
      name: e.name.trim(),
      is_active: e.is_active,
    })
    toast.push('Movement reason updated', 'success')
    // reflect in rows + edits; update __origCode if code was changed
    const idx = rows.value.findIndex((r) => r.code === e.__origCode)
    if (idx >= 0) rows.value[idx] = saved
    const eidx = edits.value.findIndex((x) => x.__origCode === e.__origCode)
    if (eidx >= 0)
      edits.value[eidx] = {
        __origCode: saved.code,
        code: saved.code,
        name: saved.name,
        is_active: saved.is_active,
      }
  } catch (err: any) {
    const msg = err?.response?.data?.detail || 'Update failed'
    toast.push(msg, 'error', 4000)
  }
}

function resetRow(e: MovementReasonIn & { __origCode: string }) {
  const orig = rows.value.find((r) => r.code === e.__origCode)
  if (!orig) return
  e.code = orig.code
  e.name = orig.name
  e.is_active = orig.is_active
}

const createOpen = ref(false)
const newForm = ref<MovementReasonIn>({ code: '', name: '', is_active: true })

function openCreate() {
  newForm.value = { code: '', name: '', is_active: true }
  createOpen.value = true
}
async function submitCreate() {
  if (!canManage.value) return
  if (!newForm.value.code.trim() || !newForm.value.name.trim()) {
    toast.push('Code and Name are required', 'error', 3000)
    return
  }
  try {
    await createMovementReason({
      code: newForm.value.code.trim(),
      name: newForm.value.name.trim(),
      is_active: newForm.value.is_active,
    })
    toast.push('Movement reason created', 'success')
    createOpen.value = false
    await load()
  } catch (err: any) {
    const msg = err?.response?.data?.detail || 'Create failed'
    toast.push(msg, 'error', 4000)
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center gap-2">
      <h1 class="text-xl">Movement Reasons</h1>
      <div class="ml-auto flex items-center gap-3">
        <label class="flex items-center gap-2 text-sm opacity-90">
          <input type="checkbox" v-model="onlyActive" @change="load" />
          Active only
        </label>
        <input
          v-model="q"
          placeholder="Search code or name…"
          class="w-[min(320px,100%)] px-3 py-2 rounded-md bg-[var(--bg-tertiary)] outline-none"
        />
        <button
          v-if="canManage"
          class="px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg-primary)]"
          @click="openCreate"
        >
          + New reason
        </button>
      </div>
    </div>

    <div class="rounded-xl bg-[var(--bg-secondary)] p-2 overflow-auto">
      <table class="w-full text-sm">
        <thead class="text-left text-[var(--text-muted)]">
          <tr>
            <th class="px-3 py-2">Code</th>
            <th class="px-3 py-2">Name</th>
            <th class="px-3 py-2">Active</th>
            <th class="px-3 py-2 w-[200px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="px-3 py-6 text-center opacity-70">Loading…</td>
          </tr>
          <tr v-else-if="!filtered.length">
            <td colspan="4" class="px-3 py-6 text-center opacity-70">No movement reasons found.</td>
          </tr>

          <tr
            v-for="e in filtered"
            :key="e.__origCode"
            class="border-t border-[var(--border-subtle)]"
          >
            <td class="px-3 py-2">
              <input
                v-model="e.code"
                :disabled="!canManage"
                class="w-full max-w-full min-w-0 block px-2 py-1 rounded bg-[var(--bg-tertiary)] outline-none"
              />
              <div class="text-[10px] opacity-60 mt-1">Original: {{ e.__origCode }}</div>
            </td>
            <td class="px-3 py-2">
              <input
                v-model="e.name"
                :disabled="!canManage"
                class="w-full max-w-full min-w-0 block px-2 py-1 rounded bg-[var(--bg-tertiary)] outline-none"
              />
              <div class="text-[10px] opacity-60 mt-1">Current Name</div>
            </td>
            <td class="px-3 py-2">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" v-model="e.is_active" :disabled="!canManage" />
                <span>{{ e.is_active ? 'Yes' : 'No' }}</span>
              </label>
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-1 rounded bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50"
                  :disabled="!canManage || !isChanged(e)"
                  @click="saveRow(e)"
                >
                  Save
                </button>
                <button
                  class="px-3 py-1 rounded bg-[var(--bg-tertiary)]"
                  :disabled="!canManage || !isChanged(e)"
                  @click="resetRow(e)"
                >
                  Reset
                </button>
                <!-- No Delete: backend does not expose DELETE /movement-reasons/{code} -->
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create modal -->
    <div v-if="createOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/55" @click="createOpen = false" />
      <div
        class="relative w-[min(560px,94vw)] p-4 rounded-xl bg-[var(--bg-secondary)] shadow-[var(--panel-shadow)]"
      >
        <div class="text-lg font-medium">New movement reason</div>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">Code</label>
            <input
              v-model="newForm.code"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
            />
          </div>
          <div class="min-w-0">
            <label class="block text-xs opacity-80 mb-1">Name</label>
            <input
              v-model="newForm.name"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
            />
          </div>
          <div class="min-w-0 md:col-span-2">
            <label class="inline-flex items-center gap-2">
              <input type="checkbox" v-model="newForm.is_active" />
              <span>Active</span>
            </label>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button class="px-3 py-2 rounded bg-[var(--bg-tertiary)]" @click="createOpen = false">
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
  width: 100%;
  padding: 8px 10px;
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
.btn.danger {
  background: #7a2b2b;
}
.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.2fr 2fr 1fr 1fr;
  gap: 8px;
  align-items: center;
}
.table-head {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 6px;
}
.table-row + .table-row {
  margin-top: 8px;
}
.err {
  color: #e65a5a;
}
.pill {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 0.8rem;
}
.pill.ok {
  background: #1b7f52;
  color: white;
}
.pill.muted {
  background: #3b3b3b;
  color: #ddd;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}
</style>
