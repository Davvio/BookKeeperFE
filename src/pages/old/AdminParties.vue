<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listParties, createParty, deleteParty } from '@/services/partiesApi'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const rows = ref<{ id: number; name: string; members_count: number }[]>([])
const name = ref('')
const description = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await listParties()
  } catch {
    error.value = 'Failed to load parties'
  } finally {
    loading.value = false
  }
}
async function create() {
  if (!name.value) return
  try {
    await createParty({ name: name.value, description: description.value || undefined })
    name.value = ''
    description.value = ''
    await load()
  } catch {
    error.value = 'Create failed'
  }
}
async function remove(id: number) {
  if (!confirm('Delete party?')) return
  await deleteParty(id)
  await load()
}
function openParty(id: number) {
  router.push(`/admin/parties/${id}`)
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-600">Parties</h1>
    <div class="flex gap-2 items-end">
      <div class="flex flex-col">
        <label>Name</label>
        <input v-model="name" class="input" placeholder="New party name" />
      </div>
      <div class="flex flex-col flex-1">
        <label>Description</label>
        <input v-model="description" class="input" placeholder="Optional" />
      </div>
      <button class="btn" @click="create">Create</button>
    </div>

    <div v-if="error" class="text-red-5">{{ error }}</div>
    <div v-if="loading">Loading…</div>

    <table class="w-full">
      <thead>
        <tr>
          <th class="text-left">Name</th>
          <th>Members</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in rows" :key="p.id" class="hover:bg-[var(--bg-tertiary)]">
          <td class="py-2 px-2 cursor-pointer" @click="openParty(p.id)">{{ p.name }}</td>
          <td class="text-center">{{ p.members_count }}</td>
          <td class="text-right">
            <button class="btn danger" @click="remove(p.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.input {
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 8px;
}
.btn {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--accent);
}
.btn.danger {
  background: #b33;
}
</style>
