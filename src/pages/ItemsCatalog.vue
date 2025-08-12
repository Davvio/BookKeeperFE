<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AxiosError } from 'axios'
import { listItems, createItem, updateItem, type Item } from '@/services/itemsApi'

/** State */
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const items = ref<Item[]>([])
const q = ref('')
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')

/** Create form */
const newName = ref('')
const newCategory = ref('')
const newStack = ref<number | null>(64)
const newActive = ref(true)
const savingCreate = ref(false)

/** Inline edit */
const editingId = ref<number | null>(null)
const editName = ref('')
const editCategory = ref('')
const editStack = ref<number | null>(64)
const editActive = ref(true)
const savingEdit = ref(false)

/** Helpers */
function uniqueCategories(): string[] {
  const set: Record<string, true> = {}
  for (let i = 0; i < items.value.length; i++) {
    const c = items.value[i].category
    if (typeof c === 'string' && c.length > 0) set[c] = true
  }
  return Object.keys(set).sort()
}

const categories = computed(() => uniqueCategories())

function clearAlerts() {
  errorMsg.value = ''
  successMsg.value = ''
}

async function load() {
  loading.value = true
  clearAlerts()
  try {
    // Build params according to activeFilter
    let activeParam: boolean | undefined = undefined
    if (activeFilter.value === 'active') activeParam = true
    if (activeFilter.value === 'inactive') activeParam = false

    const params: { q?: string; category?: string; active?: boolean } = {}
    const query = q.value.trim()
    if (query.length > 0) params.q = query
    if (typeof activeParam === 'boolean') params.active = activeParam

    items.value = await listItems(params)
  } catch (e) {
    let detail = ''
    const ax = e as AxiosError<{ detail?: string }>
    if (ax && ax.response && ax.response.data && typeof ax.response.data.detail === 'string') {
      detail = ax.response.data.detail as string
    }
    errorMsg.value = detail || 'Failed to load items.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** Create */
function validateCreate(): string {
  if (newName.value.trim().length < 2 || newName.value.trim().length > 120) {
    return 'Name must be 2–120 characters.'
  }
  if (newCategory.value.trim().length < 2 || newCategory.value.trim().length > 50) {
    return 'Category must be 2–50 characters.'
  }
  if (newStack.value === null || newStack.value < 1 || newStack.value > 999) {
    return 'Stack size must be between 1 and 999.'
  }
  return ''
}

async function onCreate() {
  clearAlerts()
  const v = validateCreate()
  if (v.length > 0) {
    errorMsg.value = v
    return
  }
  savingCreate.value = true
  try {
    const created = await createItem({
      name: newName.value.trim(),
      category: newCategory.value.trim(),
      stack_size: Number(newStack.value),
      is_active: !!newActive.value,
    })
    // prepend
    const next: Item[] = [created]
    for (let i = 0; i < items.value.length; i++) next.push(items.value[i])
    items.value = next
    successMsg.value = `Item '${created.name}' created.`
    // reset form
    newName.value = ''
    newCategory.value = ''
    newStack.value = 64
    newActive.value = true
  } catch (e) {
    let detail = ''
    const ax = e as AxiosError<{ detail?: string }>
    if (ax && ax.response && ax.response.data && typeof ax.response.data.detail === 'string') {
      detail = ax.response.data.detail as string
    }
    if (detail.length === 0) detail = 'Failed to create item.'
    errorMsg.value = detail
  } finally {
    savingCreate.value = false
  }
}

/** Edit */
function startEdit(it: Item) {
  editingId.value = it.id
  editName.value = it.name
  editCategory.value = it.category
  editStack.value = it.stack_size
  editActive.value = it.is_active
  clearAlerts()
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
  editCategory.value = ''
  editStack.value = 64
  editActive.value = true
}

function validateEdit(): string {
  if (editName.value.trim().length < 2 || editName.value.trim().length > 120) {
    return 'Name must be 2–120 characters.'
  }
  if (editCategory.value.trim().length < 2 || editCategory.value.trim().length > 50) {
    return 'Category must be 2–50 characters.'
  }
  if (editStack.value === null || editStack.value < 1 || editStack.value > 999) {
    return 'Stack size must be between 1 and 999.'
  }
  return ''
}

async function saveEdit() {
  if (editingId.value === null) return
  clearAlerts()
  const v = validateEdit()
  if (v.length > 0) {
    errorMsg.value = v
    return
  }
  savingEdit.value = true
  const id = editingId.value
  try {
    const updated = await updateItem(id, {
      name: editName.value.trim(),
      category: editCategory.value.trim(),
      stack_size: Number(editStack.value),
      is_active: !!editActive.value,
    })
    // replace in list
    const next: Item[] = []
    for (let i = 0; i < items.value.length; i++) {
      const it = items.value[i]
      next.push(it.id === id ? updated : it)
    }
    items.value = next
    successMsg.value = `Item '${updated.name}' updated.`
    cancelEdit()
  } catch (e) {
    let detail = ''
    const ax = e as AxiosError<{ detail?: string }>
    if (ax && ax.response && ax.response.data && typeof ax.response.data.detail === 'string') {
      detail = ax.response.data.detail as string
    }
    if (detail.length === 0) detail = 'Failed to update item.'
    errorMsg.value = detail
  } finally {
    savingEdit.value = false
  }
}

/** Toggle Active quickly */
async function toggleActive(it: Item) {
  clearAlerts()
  const original = it.is_active
  // optimistic UI
  it.is_active = !original
  try {
    await updateItem(it.id, { is_active: it.is_active })
    successMsg.value = `Item '${it.name}' ${it.is_active ? 'activated' : 'deactivated'}.`
  } catch (e) {
    // revert on error
    it.is_active = original
    let detail = ''
    const ax = e as AxiosError<{ detail?: string }>
    if (ax && ax.response && ax.response.data && typeof ax.response.data.detail === 'string') {
      detail = ax.response.data.detail as string
    }
    if (detail.length === 0) detail = 'Failed to update active state.'
    errorMsg.value = detail
  }
}

/** Filtered list (client-side text filter applies on already-fetched items) */
const viewItems = computed<Item[]>(() => {
  const term = q.value.trim().toLowerCase()
  if (term.length === 0) return items.value
  const out: Item[] = []
  for (let i = 0; i < items.value.length; i++) {
    const it = items.value[i]
    const name = it.name.toLowerCase()
    const cat = it.category.toLowerCase()
    if (name.indexOf(term) !== -1 || cat.indexOf(term) !== -1) out.push(it)
  }
  return out
})
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl mb-4">Items Catalog</h2>

    <!-- Alerts -->
    <div v-if="errorMsg" class="alert err">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert ok">{{ successMsg }}</div>

    <!-- Create -->
    <div class="card mb-4">
      <h3 class="text-lg mb-2">Create Item</h3>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label class="label">Name</label>
          <input class="input" v-model.trim="newName" placeholder="Iron Ingot" />
        </div>

        <div>
          <label class="label">Category</label>
          <input class="input" v-model.trim="newCategory" placeholder="Ingot" list="cats" />
          <datalist id="cats">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </datalist>
        </div>

        <div>
          <label class="label">Stack size</label>
          <input class="input" type="number" min="1" max="999" v-model.number="newStack" />
        </div>

        <div class="flex items-center gap-2">
          <input id="newActive" type="checkbox" v-model="newActive" />
          <label for="newActive">Active</label>
        </div>
      </div>

      <div class="mt-3">
        <button class="btn primary" :disabled="savingCreate" @click="onCreate">Create</button>
        <span v-if="savingCreate" class="ml-2">Saving…</span>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="card mb-3 toolbar">
      <div class="left">
        <input class="input" placeholder="Filter by name/category…" v-model="q" />
      </div>
      <div class="right flex gap-2 items-center">
        <label class="label">Show</label>
        <select class="input" v-model="activeFilter" @change="load">
          <option value="all">All</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <button class="btn" @click="load">Reload</button>
      </div>
    </div>

    <!-- List -->
    <div v-if="loading">Loading…</div>
    <div v-else class="card">
      <div class="thead">
        <div>Name</div>
        <div>Category</div>
        <div class="text-right">Stack</div>
        <div class="text-center">Active</div>
        <div class="text-right">Actions</div>
      </div>

      <div v-if="viewItems.length === 0" class="empty-row">No items found.</div>

      <div v-for="it in viewItems" :key="it.id" class="trow">
        <!-- Display vs Edit mode -->
        <template v-if="editingId !== it.id">
          <div class="name">{{ it.name }}</div>
          <div>{{ it.category }}</div>
          <div class="text-right mono">{{ it.stack_size }}</div>
          <div class="text-center">
            <input type="checkbox" :checked="it.is_active" @change="toggleActive(it)" />
          </div>
          <div class="text-right">
            <button class="btn" @click="startEdit(it)">Edit</button>
          </div>
        </template>

        <template v-else>
          <div>
            <input class="input" v-model.trim="editName" />
          </div>
          <div>
            <input class="input" v-model.trim="editCategory" list="cats" />
          </div>
          <div class="text-right">
            <input class="input" type="number" min="1" max="999" v-model.number="editStack" />
          </div>
          <div class="text-center">
            <input type="checkbox" v-model="editActive" />
          </div>
          <div class="text-right">
            <button class="btn primary" :disabled="savingEdit" @click="saveEdit">Save</button>
            <button class="btn" @click="cancelEdit">Cancel</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-xl {
  font-size: 1.25rem;
}
.text-lg {
  font-size: 1.1rem;
}
.mb-4 {
  margin-bottom: 16px;
}
.mb-3 {
  margin-bottom: 12px;
}
.mt-3 {
  margin-top: 12px;
}
.ml-2 {
  margin-left: 8px;
}

.card {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 12px;
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
.md\:grid-cols-4 {
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .md\:grid-cols-4 {
    grid-template-columns: 1.2fr 1fr 0.8fr 0.8fr;
  }
}
.gap-3 {
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.left {
  flex: 1;
  margin-right: 12px;
}
.right {
  display: flex;
  align-items: center;
}

.thead,
.trow {
  display: grid;
  grid-template-columns: 2fr 1.4fr 0.8fr 0.8fr 0.9fr;
  gap: 8px;
  align-items: center;
}
.thead {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.trow {
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 10px;
  padding: 8px;
}

.empty-row {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  border: 1px dashed var(--bg-tertiary);
  border-radius: 10px;
}

.name {
  font-weight: 600;
  color: var(--text-primary);
}
.mono {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}
.flex {
  display: flex;
}
.items-center {
  align-items: center;
}
.gap-2 {
  gap: 8px;
}
.label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: inline-block;
  margin-bottom: 6px;
}
.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}
</style>
