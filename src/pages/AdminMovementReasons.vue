<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMovementReasonsStore } from '@/stores/movementReasons'

const store = useMovementReasonsStore()
const creating = ref(false)
const newCode = ref('')
const newName = ref('')
const errorMsg = ref('')

onMounted(async () => {
  await store.ensureLoaded()
})

async function createReason() {
  errorMsg.value = ''
  try {
    if (!newCode.value.trim() || !newName.value.trim()) {
      errorMsg.value = 'Code and name are required.'
      return
    }
    await store.addReason({
      code: newCode.value.trim(),
      name: newName.value.trim(),
      is_active: true,
    })
    newCode.value = ''
    newName.value = ''
    creating.value = false
  } catch {
    errorMsg.value = 'Failed to create reason.'
  }
}

async function toggleActive(code: string, current: boolean) {
  try {
    await store.patchReason(code, { is_active: !current })
  } catch {
    // optional toast
  }
}

async function rename(code: string, name: string) {
  const newLabel = prompt('New name', name)
  if (newLabel && newLabel.trim() && newLabel !== name) {
    try {
      await store.patchReason(code, { name: newLabel.trim() })
    } catch {
      /* ignore */
    }
  }
}

async function remove(code: string) {
  if (!confirm(`Delete reason "${code}"?`)) return
  try {
    await store.removeReason(code)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div class="p-4 max-w-3xl">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-semibold">Movement Reasons</h1>
      <button class="btn" @click="creating = !creating">
        {{ creating ? 'Cancel' : 'Add reason' }}
      </button>
    </div>

    <div v-if="creating" class="card mb-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="label">Code</label>
          <input class="input" v-model.trim="newCode" placeholder="e.g. MINED" />
        </div>
        <div class="md:col-span-2">
          <label class="label">Name</label>
          <input class="input" v-model.trim="newName" placeholder="e.g. Mined" />
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button class="btn primary" @click="createReason">Create</button>
        <span v-if="errorMsg" class="err">{{ errorMsg }}</span>
      </div>
    </div>

    <div class="card">
      <div class="table-head">
        <div>Code</div>
        <div>Name</div>
        <div>Status</div>
        <div class="w-32 text-right">Actions</div>
      </div>
      <div v-for="r in store.reasons" :key="r.code" class="table-row">
        <div class="mono">{{ r.code }}</div>
        <div>{{ r.name }}</div>
        <div>
          <span class="pill" :class="r.is_active ? 'ok' : 'muted'">{{
            r.is_active ? 'Active' : 'Inactive'
          }}</span>
        </div>
        <div class="text-right space-x-2">
          <button class="btn" @click="rename(r.code, r.name)">Rename</button>
          <button class="btn" @click="toggleActive(r.code, r.is_active)">
            {{ r.is_active ? 'Deactivate' : 'Activate' }}
          </button>
          <button class="btn danger" @click="remove(r.code)">Delete</button>
        </div>
      </div>
      <div v-if="store.loading" class="p-3 text-sm text-gray-400">Loading…</div>
      <div v-if="!store.loading && store.reasons.length === 0" class="p-3 text-sm text-gray-400">
        No reasons yet.
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
