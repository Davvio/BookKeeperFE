<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { AxiosError } from 'axios'
import BkSelect from '@/components/BkSelect.vue'
import { useItemsStore } from '@/stores/items'
import { getSettings, setCurrency } from '@/services/structureApi'

type Settings = {
  structure_id: string
  currency_item_id: number | null
  currency_item_name: string | null
}

const itemsStore = useItemsStore()

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const settings = ref<Settings>({
  structure_id: '',
  currency_item_id: null,
  currency_item_name: null,
})

const selectedItemId = ref<number | null>(null)

function clearAlerts() {
  errorMsg.value = ''
  successMsg.value = ''
}

async function load() {
  loading.value = true
  clearAlerts()
  try {
    if (itemsStore.items.length === 0) {
      await itemsStore.refresh()
    }
    const s = await getSettings()
    settings.value = s
    selectedItemId.value = s.currency_item_id
  } catch (e: unknown) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to load structure settings.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const currentName = computed(() => {
  const id = settings.value.currency_item_id
  if (id === null) return '—'
  const it = itemsStore.byId[id]
  return it ? it.name : `#${id}`
})

const canSave = computed(() => {
  return selectedItemId.value !== null && selectedItemId.value !== settings.value.currency_item_id
})

async function save() {
  if (!canSave.value || selectedItemId.value === null) return
  saving.value = true
  clearAlerts()
  try {
    const updated = await setCurrency(selectedItemId.value)
    settings.value = updated
    successMsg.value = `Currency item set to '${updated.currency_item_name ?? '#' + updated.currency_item_id}'.`
  } catch (e: unknown) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to update currency item.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl mb-4">Structure Currency</h2>

    <div v-if="loading">Loading…</div>
    <div v-else>
      <div v-if="errorMsg" class="alert err">{{ errorMsg }}</div>
      <div v-if="successMsg" class="alert ok">{{ successMsg }}</div>

      <div class="card">
        <div class="mb-3">
          <div class="label">Current currency item</div>
          <div class="current">{{ currentName }}</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="label">Choose a new currency item</label>
            <BkSelect
              :items="itemsStore.items"
              v-model="selectedItemId"
              :getLabel="(i) => i.name"
              :getValue="(i) => i.id"
              placeholder="Select item…"
            />
          </div>

          <div class="flex items-end">
            <button class="btn primary" :disabled="!canSave || saving" @click="save">Save</button>
            <span v-if="saving" class="ml-2">Saving…</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-xl {
  font-size: 1.25rem;
}
.mb-4 {
  margin-bottom: 16px;
}
.mb-3 {
  margin-bottom: 12px;
}
.ml-2 {
  margin-left: 8px;
}
.card {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 12px;
}
.label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 6px;
}
.current {
  font-weight: 600;
  color: var(--text-primary);
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
.alert {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 8px;
}
.alert.ok {
  background: #203a2f;
  color: #9ee0bf;
}
.alert.err {
  background: #3a2222;
  color: #ffb4b4;
}
.grid {
  display: grid;
}
.grid-cols-1 {
  grid-template-columns: 1fr;
}
.md\:grid-cols-2 {
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: 1.4fr 0.6fr;
  }
}
.gap-3 {
  gap: 12px;
}
.flex {
  display: flex;
}
.items-end {
  align-items: flex-end;
}
</style>
