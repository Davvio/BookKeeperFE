<!-- src/pages/ItemsCatalog.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listItems, createItem, updateItem, type Item } from '@/services/itemsApi'
const rows = ref<Item[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const form = ref({ name: '', category: 'ingot', stack_size: 64, is_active: true })
async function load() {
  loading.value = true
  try {
    rows.value = await listItems()
  } finally {
    loading.value = false
  }
}
async function add() {
  error.value = null
  try {
    await createItem(form.value)
    form.value = { name: '', category: 'ingot', stack_size: 64, is_active: true }
    await load()
  } catch {
    error.value = 'Failed to create item'
  }
}
async function toggleActive(it: Item) {
  await updateItem(it.id, { is_active: !it.is_active })
  await load()
}
onMounted(load)
</script>
<template>
  <div class="p-6 space-y-4">
    <h2 class="text-2xl font-bold">Items Catalog</h2>
    <div class="p-4 border rounded bg-[--bg-secondary] max-w-xl space-y-2">
      <div class="font-semibold">Create item</div>
      <input v-model="form.name" class="border px-2 py-1 rounded w-full" placeholder="Name" />
      <div class="flex gap-2">
        <select v-model="form.category" class="border px-2 py-1 rounded">
          <option value="ore">ore</option>
          <option value="ingot">ingot</option>
          <option value="gem">gem</option>
          <option value="crop">crop</option>
          <option value="food">food</option>
          <option value="material">material</option>
          <option value="tool">tool</option>
          <option value="weapon">weapon</option>
          <option value="armor">armor</option>
          <option value="potion">potion</option>
          <option value="mob_drop">mob_drop</option>
          <option value="block">block</option>
          <option value="misc">misc</option>
        </select>
        <input
          v-model.number="form.stack_size"
          type="number"
          min="1"
          max="999"
          class="border px-2 py-1 rounded w-32"
        />
        <label class="flex items-center gap-2 text-sm"
          ><input type="checkbox" v-model="form.is_active" /> Active</label
        >
      </div>
      <div class="flex gap-2">
        <button @click="add" class="px-3 py-1 border rounded">Create</button>
        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
      </div>
    </div>

    <div>
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-50">
            <th class="border px-2 py-2 text-left">Name</th>
            <th class="border px-2 py-2">Code</th>
            <th class="border px-2 py-2">Category</th>
            <th class="border px-2 py-2">Stack</th>
            <th class="border px-2 py-2">Active</th>
            <th class="border px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in rows" :key="i.id" class="hover:bg-gray-50">
            <td class="border px-2 py-2 text-left">{{ i.name }}</td>
            <td class="border px-2 py-2">{{ i.code }}</td>
            <td class="border px-2 py-2">{{ i.category }}</td>
            <td class="border px-2 py-2">{{ i.stack_size }}</td>
            <td class="border px-2 py-2">{{ i.is_active ? 'Yes' : 'No' }}</td>
            <td class="border px-2 py-2">
              <button @click="toggleActive(i)" class="px-2 py-1 border rounded">
                {{ i.is_active ? 'Disable' : 'Enable' }}
              </button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6" class="border px-2 py-6 text-center opacity-70">No items</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
