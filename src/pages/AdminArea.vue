<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/services/api'
import { useAuth } from '@/stores/auth'

type UserRow = { id: number; username: string; role: string }

const auth = useAuth()
const loading = ref(false)
const error = ref<string | null>(null)
const ok = ref<string | null>(null)
const users = ref<UserRow[]>([])

const form = ref({
  username: '',
  password: '',
  role: 'EMPLOYEE',
})

async function loadUsers() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<UserRow[]>('/users')
    users.value = data
  } catch {
    error.value = 'Failed to load users'
  } finally {
    loading.value = false
  }
}

async function submit() {
  ok.value = null
  error.value = null
  try {
    await api.post('/users', {
      username: form.value.username.trim(),
      password: form.value.password,
      role: form.value.role,
    })
    ok.value = 'User created'
    form.value.username = ''
    form.value.password = ''
    form.value.role = 'EMPLOYEE'
    await loadUsers()
  } catch {
    error.value = 'Failed to create user'
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="p-6 grid gap-3 md:grid-cols-3">
    <router-link
      to="/admin/items"
      class="p-4 border rounded bg-[--bg-secondary] hover:bg-[--bg-tertiary]"
      >Items Catalog</router-link
    >
    <router-link
      to="/admin/currency"
      class="p-4 border rounded bg-[--bg-secondary] hover:bg-[--bg-tertiary]"
      >Structure Currency</router-link
    >
    <router-link
      to="/admin/valuations"
      class="p-4 border rounded bg-[--bg-secondary] hover:bg-[--bg-tertiary]"
      >Item Valuations</router-link
    >
  </div>
  <div class="p-6 space-y-6">
    <h2 class="text-2xl font-bold text-[--text-primary]">Admin Area</h2>
    <p class="text-[--text-muted]">
      Structure: <b>{{ auth.structureId ?? 'unknown' }}</b> — Role: <b>{{ auth.role }}</b>
    </p>

    <!-- Create user form -->
    <div
      class="p-4 rounded-lg border border-[--bg-tertiary] bg-[--bg-secondary] max-w-xl space-y-3"
    >
      <h3 class="font-semibold">Create User (same structure)</h3>

      <div class="flex flex-col gap-2">
        <label class="text-sm">Username</label>
        <input
          v-model="form.username"
          class="border px-3 py-2 rounded"
          placeholder="new username"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm">Password</label>
        <input
          v-model="form.password"
          type="password"
          class="border px-3 py-2 rounded"
          placeholder="password"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm">Role</label>
        <select v-model="form.role" class="border px-3 py-2 rounded">
          <option value="EMPLOYEE">EMPLOYEE</option>
          <option value="ADMIN">ADMIN</option>
          <option value="GUILDMASTER">GUILDMASTER</option>
        </select>
      </div>

      <div class="flex gap-2">
        <button @click="submit" class="px-4 py-2 rounded border hover:bg-gray-50">Create</button>
        <button @click="loadUsers" class="px-4 py-2 rounded border hover:bg-gray-50">
          Refresh
        </button>
      </div>

      <div v-if="ok" class="text-green-600 text-sm">{{ ok }}</div>
      <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
    </div>

    <!-- Users table -->
    <div>
      <h3 class="font-semibold mb-2">Users in your structure</h3>
      <div v-if="loading">Loading…</div>
      <div v-else>
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-gray-50">
              <th class="border px-2 py-2 text-left">ID</th>
              <th class="border px-2 py-2 text-left">Username</th>
              <th class="border px-2 py-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="hover:bg-gray-50">
              <td class="border px-2 py-2">{{ u.id }}</td>
              <td class="border px-2 py-2">{{ u.username }}</td>
              <td class="border px-2 py-2">{{ u.role }}</td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="3" class="border px-2 py-6 text-center opacity-70">No users yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
