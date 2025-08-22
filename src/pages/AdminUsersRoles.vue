<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/stores/toast'
import { useAuth } from '@/stores/auth'
import { api } from '@/services/api'
import { listUsers as listUsersApi, createUser as createUserApi } from '@/services/usersApi'
import { listRoles as listRolesApi } from '@/services/rolesApi'

type UserRow = {
  id: number
  username: string
  structure_id: string
  role_ids: number[]
  role_codes: string[]
  role_names: string[]
}

const ALLOWED_ROLE_CODES = ['ADMIN', 'QUARTERMASTER', 'EMPLOYEE'] as const
type AllowedRole = (typeof ALLOWED_ROLE_CODES)[number]

const toast = useToast()
const auth = useAuth()
const isAdmin = computed(() => {
  try {
    const json = JSON.parse(atob((auth.token || '').split('.')[1] || '')) || {}
    return !!(json.permissions && json.permissions['users.admin'])
  } catch {
    return false
  }
})

const loading = ref(false)
const users = ref<UserRow[]>([])
const roles = ref<{ id: number; code: string; name: string }[]>([])
const codeToId = ref<Record<string, number>>({})

const q = ref('')

// existing: track edited role selections (codes) per user
const selectedRoles = ref<Record<number, Set<AllowedRole>>>({})

function setFromInitial(u: UserRow) {
  const s = new Set<AllowedRole>()
  for (const c of u.role_codes) {
    if (ALLOWED_ROLE_CODES.includes(c as AllowedRole)) s.add(c as AllowedRole)
  }
  selectedRoles.value[u.id] = s
}

async function load() {
  loading.value = true
  try {
    users.value = await listUsersApi()
    try {
      roles.value = await listRolesApi()
    } catch {
      roles.value = []
    }
    const allowed = roles.value.filter((r) => ALLOWED_ROLE_CODES.includes(r.code as AllowedRole))
    codeToId.value = Object.fromEntries(allowed.map((r) => [r.code, r.id]))
    for (const u of users.value) setFromInitial(u)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = computed(() => {
  const t = q.value.trim().toLowerCase()
  if (!t) return users.value
  return users.value.filter((u) => (u.username || '').toLowerCase().includes(t))
})

function toggle(u: UserRow, code: AllowedRole) {
  const s = selectedRoles.value[u.id] || new Set<AllowedRole>()
  if (s.has(code)) s.delete(code)
  else s.add(code)
  selectedRoles.value[u.id] = s
}

function changed(u: UserRow) {
  const s = selectedRoles.value[u.id] || new Set<AllowedRole>()
  const initial = new Set<AllowedRole>(
    u.role_codes.filter((c) => ALLOWED_ROLE_CODES.includes(c as AllowedRole)) as AllowedRole[],
  )
  if (s.size !== initial.size) return true
  for (const c of s) if (!initial.has(c)) return true
  return false
}

async function save(u: UserRow) {
  if (!isAdmin.value) return
  const s = selectedRoles.value[u.id] || new Set<AllowedRole>()
  const role_codes = Array.from(s)
  const role_ids = role_codes
    .map((code) => codeToId.value[code])
    .filter((v) => typeof v === 'number')

  if (role_ids.length !== role_codes.length) {
    const missing = role_codes.filter((code) => !(code in codeToId.value))
    toast.push(`Missing roles in this structure: ${missing.join(', ')}`, 'error', 4000)
    return
  }

  try {
    await api.patch(`/users/${u.id}/roles`, { role_ids })
    toast.push(`Updated roles for ${u.username}`, 'success')
    u.role_codes = role_codes
    u.role_names = role_codes
  } catch (e: any) {
    toast.push(e?.response?.data?.detail || 'Failed to update roles', 'error', 4000)
  }
}

/* ---------------------------
   NEW USER: modal + handler
----------------------------*/
const createOpen = ref(false)
const nu_username = ref('')
const nu_password = ref('')
const nu_roles = ref<Set<AllowedRole>>(new Set<AllowedRole>(['EMPLOYEE'])) // default EMPLOYEE

const canSubmitNew = computed(() => {
  const nameOk = nu_username.value.trim().length >= 3
  const passOk = nu_password.value.length >= 6
  const rolesOk = nu_roles.value.size > 0
  return nameOk && passOk && rolesOk
})

function toggleNewRole(code: AllowedRole) {
  const s = nu_roles.value
  if (s.has(code)) s.delete(code)
  else s.add(code)
}

async function submitCreateUser() {
  if (!isAdmin.value || !canSubmitNew.value) return
  const role_codes = Array.from(nu_roles.value)
  const role_ids = role_codes
    .map((code) => codeToId.value[code])
    .filter((v) => typeof v === 'number')

  if (role_ids.length !== role_codes.length) {
    const missing = role_codes.filter((code) => !(code in codeToId.value))
    toast.push(`Missing roles in this structure: ${missing.join(', ')}`, 'error', 4000)
    return
  }

  try {
    await createUserApi({
      username: nu_username.value.trim(),
      password: nu_password.value,
      role_ids,
    })
    toast.push(`User "${nu_username.value.trim()}" created`, 'success')
    // reset + close
    nu_username.value = ''
    nu_password.value = ''
    nu_roles.value = new Set<AllowedRole>(['EMPLOYEE'])
    createOpen.value = false
    // refresh list
    await load()
  } catch (e: any) {
    toast.push(e?.response?.data?.detail || 'Failed to create user', 'error', 4000)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <h1 class="text-xl">Users & Roles</h1>
      <div class="ml-auto flex items-center gap-2">
        <input
          v-model="q"
          placeholder="Search user…"
          class="w-[min(360px,100%)] px-3 py-2 rounded-md bg-[var(--bg-tertiary)] outline-none"
        />
        <button
          v-if="isAdmin"
          class="px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg-primary)]"
          @click="createOpen = true"
        >
          + New user
        </button>
      </div>
    </div>

    <div class="rounded-xl bg-[var(--bg-secondary)] p-2 overflow-auto">
      <table class="w-full text-sm">
        <thead class="text-left text-[var(--text-muted)]">
          <tr>
            <th class="px-3 py-2">User</th>
            <th class="px-3 py-2">Structure</th>
            <th class="px-3 py-2">Roles</th>
            <th class="px-3 py-2 w-[160px]">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="px-3 py-6 text-center opacity-70">Loading…</td>
          </tr>
          <tr v-else-if="!filtered.length">
            <td colspan="4" class="px-3 py-6 text-center opacity-70">No users found.</td>
          </tr>

          <tr v-for="u in filtered" :key="u.id" class="border-t border-[var(--border-subtle)]">
            <td class="px-3 py-2">
              <div class="font-medium">{{ u.username }}</div>
              <div class="text-xs opacity-70">#{{ u.id }}</div>
            </td>
            <td class="px-3 py-2">{{ u.structure_id }}</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="code in ['ADMIN', 'QUARTERMASTER', 'EMPLOYEE']"
                  :key="code"
                  class="inline-flex items-center gap-2 px-2 py-1 rounded bg-[var(--bg-tertiary)]"
                >
                  <input
                    type="checkbox"
                    :checked="(selectedRoles[u.id] || new Set()).has(code as any)"
                    @change="toggle(u, code as any)"
                    :disabled="!isAdmin"
                  />
                  <span class="text-xs">{{ code }}</span>
                </label>
              </div>
            </td>
            <td class="px-3 py-2">
              <button
                class="px-3 py-1 rounded bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50"
                :disabled="!isAdmin || !changed(u)"
                @click="save(u)"
              >
                Save
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create User modal -->
    <div v-if="createOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/55" @click="createOpen = false" />
      <div
        class="relative w-[min(560px,94vw)] p-4 rounded-xl bg-[var(--bg-secondary)] shadow-[var(--panel-shadow)]"
      >
        <div class="text-lg font-medium">Create user</div>

        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="min-w-0 md:col-span-2">
            <label class="block text-xs opacity-80 mb-1">Username</label>
            <input
              v-model="nu_username"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
              placeholder="username"
            />
            <div
              v-if="nu_username.trim().length > 0 && nu_username.trim().length < 3"
              class="text-xs text-red-400 mt-1"
            >
              Min 3 characters.
            </div>
          </div>

          <div class="min-w-0 md:col-span-2">
            <label class="block text-xs opacity-80 mb-1">Password</label>
            <input
              v-model="nu_password"
              type="password"
              class="w-full max-w-full min-w-0 block px-3 py-2 rounded bg-[var(--bg-tertiary)] outline-none"
              placeholder="temporary password"
            />
            <div
              v-if="nu_password.length > 0 && nu_password.length < 6"
              class="text-xs text-red-400 mt-1"
            >
              Min 6 characters.
            </div>
          </div>

          <div class="min-w-0 md:col-span-2">
            <label class="block text-xs opacity-80 mb-1">Roles</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="code in ['ADMIN', 'QUARTERMASTER', 'EMPLOYEE']"
                :key="code"
                class="inline-flex items-center gap-2 px-2 py-1 rounded bg-[var(--bg-tertiary)]"
              >
                <input
                  type="checkbox"
                  :checked="nu_roles.has(code as any)"
                  @change="toggleNewRole(code as any)"
                />
                <span class="text-xs">{{ code }}</span>
              </label>
            </div>
            <div v-if="nu_roles.size === 0" class="text-xs text-red-400 mt-1">
              Select at least one role.
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button class="px-3 py-2 rounded bg-[var(--bg-tertiary)]" @click="createOpen = false">
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50"
            :disabled="!canSubmitNew"
            @click="submitCreateUser"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* reuse your existing styles from the previous AdminArea.vue for cards/buttons/inputs */
.text-xl {
  font-size: 1.25rem;
}
.text-lg {
  font-size: 1.1rem;
}
.mb-4 {
  margin-bottom: 16px;
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
.md\:grid-cols-3 {
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .md\:grid-cols-3 {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
.gap-3 {
  gap: 12px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.thead,
.trow {
  display: grid;
  grid-template-columns: 1fr 2fr 0.7fr;
  gap: 8px;
  align-items: start;
}
.thead {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.trow {
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 10px;
  padding: 10px;
}
.empty-row {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  border: 1px dashed var(--bg-tertiary);
  border-radius: 10px;
}
.username {
  font-weight: 600;
  color: var(--text-primary);
}
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
}
.roles-box {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  background: var(--bg-tertiary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 8px;
  padding: 8px;
}
.role-check {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 8px;
  padding: 6px 8px;
}
.role-check .code {
  opacity: 0.7;
  margin-left: auto;
}
.role-check.dim {
  opacity: 0.8;
}
.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
