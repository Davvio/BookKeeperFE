<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useItemsStore } from '@/stores/items'
import { uploadItemIcon, getItemIconUrl, type Item, createItem } from '@/services/itemsApi'

const itemsStore = useItemsStore()
const uploadingId = ref<number | null>(null)

// --- create form state ---
const showCreate = ref(false)
const name = ref('')
const code = ref('')
const category = ref('')
const stack = ref<number | null>(64)
const isActive = ref(true)
const creating = ref(false)
const createErr = ref('')

onMounted(async () => {
  if (!itemsStore.items.length) await itemsStore.refresh()
})

// auto-suggest code from name if code still empty
watch(name, (v) => {
  if (!code.value) {
    code.value = (v || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  }
})

async function submitCreate() {
  createErr.value = ''
  if (!name.value.trim()) return (createErr.value = 'Name is required.')
  if (!code.value.trim()) return (createErr.value = 'Code is required.')
  if (!stack.value || stack.value < 1) return (createErr.value = 'Stack must be ≥ 1.')

  try {
    creating.value = true
    await createItem({
      name: name.value.trim(),
      code: code.value.trim(),
      category: category.value.trim(),
      stack_size: Number(stack.value),
      is_active: isActive.value,
    })
    // refresh list and reset form
    await itemsStore.refresh()
    name.value = ''
    code.value = ''
    category.value = ''
    stack.value = 64
    isActive.value = true
    showCreate.value = false
  } catch {
    createErr.value = 'Failed to create item.'
  } finally {
    creating.value = false
  }
}

async function onPick(e: Event, item: Item) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  try {
    uploadingId.value = item.id
    await uploadItemIcon(item.id, file)
    itemsStore.bumpIcon(item.id)
  } finally {
    uploadingId.value = null
  }
}
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl">Items Catalog</h1>
      <button class="btn btn--sm" @click="showCreate = !showCreate">
        {{ showCreate ? 'Cancel' : '+ Add item' }}
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showCreate" class="card mb-4">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div class="md:col-span-2">
          <label class="label">Name</label>
          <input class="input" v-model.trim="name" placeholder="e.g. Copper Ingot" />
        </div>
        <div>
          <label class="label">Code</label>
          <input class="input mono" v-model.trim="code" placeholder="e.g. copper_ingot" />
        </div>
        <div>
          <label class="label">Category</label>
          <input class="input" v-model.trim="category" placeholder="e.g. ingot" />
        </div>
        <div>
          <label class="label">Stack size</label>
          <input class="input" type="number" min="1" v-model.number="stack" />
        </div>
      </div>
      <div class="mt-3 flex items-center gap-3">
        <label class="label flex items-center gap-2">
          <input type="checkbox" v-model="isActive" /> Active
        </label>
        <button class="btn primary" :disabled="creating" @click="submitCreate">
          {{ creating ? 'Creating…' : 'Create item' }}
        </button>
        <span v-if="createErr" class="err">{{ createErr }}</span>
      </div>
    </div>

    <div class="card">
      <div class="table-head">
        <div>Icon</div>
        <div>Name</div>
        <div>Code</div>
        <div>Category</div>
        <div>Stack</div>
        <div>Active</div>
        <div class="w-26 text-right">Actions</div>
      </div>

      <div v-for="it in itemsStore.items" :key="it.id" class="table-row">
        <div class="icon-cell">
          <img
            :src="getItemIconUrl(it.id, itemsStore.iconBust[it.id])"
            class="icon"
            alt=""
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
        </div>

        <div>{{ it.name }}</div>
        <div class="mono">{{ it.code }}</div>
        <div>{{ it.category }}</div>
        <div>{{ it.stack_size }}</div>
        <div>{{ it.is_active ? 'Yes' : 'No' }}</div>

        <div class="w-32 text-right">
          <label class="btn btn--sm">
            {{ uploadingId === it.id ? 'Uploading…' : 'Upload icon' }}
            <input
              type="file"
              class="hidden"
              accept="image/*"
              :disabled="uploadingId === it.id"
              @change="onPick($event, it)"
            />
          </label>
        </div>
      </div>

      <div v-if="itemsStore.loading" class="p-3 text-sm text-gray-400">Loading…</div>
      <div v-else-if="!itemsStore.items.length" class="p-3 text-sm text-gray-400">No items.</div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 12px;
}
.table-head,
.table-row {
  display: grid;
  grid-template-columns: 0.9fr 2fr 1.4fr 1.4fr 0.8fr 0.8fr 1fr;
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
.icon-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--bg-tertiary);
}
.btn {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
  cursor: pointer;
}
.btn--sm {
  padding: 4px 8px;
  font-size: 0.85rem;
}
.hidden {
  display: none;
}
.label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 6px;
  color: var(--text-secondary);
}
.input {
  width: 90%;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 8px;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}
.err {
  color: #e65a5a;
}
</style>
