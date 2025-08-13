<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- src/pages/AdminUsersRoles.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { AxiosError } from 'axios'
import { listUsers, createUser, replaceUserRoles, type UserOut } from '@/services/usersApi'
import { listRoles, type Role } from '@/services/rolesApi'
import { useAuth } from '@/stores/auth'

const auth = useAuth()
const isAdmin = computed(() =>
  Boolean(
    (auth as any)?.permissions?.['users.admin'] ||
      (auth as any)?.user?.permissions?.['users.admin'],
  ),
)

// Data
const loading = ref(false)
const savingCreate = ref(false)
const savingEdit = ref<Record<number, boolean>>({})
const errorMsg = ref('')
const successMsg = ref('')

// Lists
const users = ref<UserOut[]>([])
const roles = ref<Role[]>([])

// Create form
const newUsername = ref('')
const newPassword = ref('')
const newRoleIds = ref<number[]>([])

// Inline edit state
const editingUserId = ref<number | null>(null)
const editRoleIds = ref<number[]>([])

// Search
const q = ref('')

// Derived
const roleMap = computed(() => {
  const m: Record<number, Role> = {}
  for (const r of roles.value) m[r.id] = r
  return m
})
const filteredUsers = computed<UserOut[]>(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return users.value
  return users.value.filter(
    (u) =>
      u.username.toLowerCase().includes(term) ||
      u.role_names.some((n) => n.toLowerCase().includes(term)) ||
      u.role_codes.some((c) => c.toLowerCase().includes(term)),
  )
})

async function loadAll() {
  loading.value = true
  errorMsg.value = ''
  try {
    roles.value = await listRoles()
    users.value = await listUsers()
  } catch (e) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to load admin data.'
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

function resetCreateForm() {
  newUsername.value = ''
  newPassword.value = ''
  newRoleIds.value = []
}

async function onCreateUser() {
  errorMsg.value = ''
  successMsg.value = ''
  if (newUsername.value.trim().length < 3)
    return (errorMsg.value = 'Username must be at least 3 characters.')
  if (newPassword.value.length < 6)
    return (errorMsg.value = 'Password must be at least 6 characters.')
  if (newRoleIds.value.length === 0) return (errorMsg.value = 'Select at least one role.')
  savingCreate.value = true
  try {
    const res = await createUser({
      username: newUsername.value.trim(),
      password: newPassword.value,
      role_ids: newRoleIds.value.slice(),
    })
    users.value.unshift(res)
    successMsg.value = `User '${res.username}' created.`
    resetCreateForm()
  } catch (e) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to create user.'
  } finally {
    savingCreate.value = false
  }
}

function startEdit(u: UserOut) {
  editingUserId.value = u.id
  editRoleIds.value = u.role_ids.slice()
}
function cancelEdit() {
  editingUserId.value = null
  editRoleIds.value = []
}
function isEditing(u: UserOut) {
  return editingUserId.value === u.id
}
function toggleRoleInEdit(roleId: number) {
  const i = editRoleIds.value.indexOf(roleId)
  if (i === -1) editRoleIds.value.push(roleId)
  else editRoleIds.value.splice(i, 1)
}
async function saveEdit(u: UserOut) {
  const uid = u.id
  savingEdit.value[uid] = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const updated = await replaceUserRoles(uid, editRoleIds.value.slice())
    const idx = users.value.findIndex((x) => x.id === uid)
    if (idx >= 0) users.value[idx] = updated
    successMsg.value = `Roles updated for '${updated.username}'.`
    cancelEdit()
  } catch (e) {
    const ax = e as AxiosError<{ detail?: string }>
    errorMsg.value = ax?.response?.data?.detail || 'Failed to update roles.'
  } finally {
    savingEdit.value[uid] = false
  }
}
function roleNameById(id: number) {
  const r = roleMap.value[id]
  return r ? r.name : '#' + String(id)
}
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl mb-4">Users & Roles</h2>

    <div v-if="loading">Loading…</div>
    <div v-else>
      <div v-if="errorMsg" class="alert err">{{ errorMsg }}</div>
      <div v-if="successMsg" class="alert ok">{{ successMsg }}</div>

      <!-- Create user -->
      <div class="card mb-4">
        <h3 class="text-lg mb-2">Create User</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="label">Username</label>
            <input class="input" v-model.trim="newUsername" placeholder="username" />
          </div>
          <div>
            <label class="label">Password</label>
            <input type="password" class="input" v-model="newPassword" placeholder="password" />
          </div>
          <div>
            <label class="label">Roles</label>
            <div class="roles-box">
              <label v-for="r in roles" :key="'create-' + r.id" class="role-check" :title="r.code">
                <input
                  type="checkbox"
                  :value="r.id"
                  :checked="newRoleIds.includes(r.id)"
                  @change="
                    ($event.target as HTMLInputElement).checked
                      ? newRoleIds.push(r.id)
                      : newRoleIds.splice(newRoleIds.indexOf(r.id), 1)
                  "
                />
                <span>{{ r.name }}</span>
                <small class="code">{{ r.code }}</small>
              </label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn primary" :disabled="savingCreate" @click="onCreateUser">Create</button>
          <span v-if="savingCreate" class="ml-2">Saving…</span>
        </div>
      </div>

      <!-- Users list -->
      <div class="card">
        <div class="toolbar">
          <input class="input" placeholder="Search users or roles…" v-model="q" />
        </div>

        <div class="thead">
          <div>Username</div>
          <div>Roles</div>
          <div class="text-right">Actions</div>
        </div>

        <div v-if="filteredUsers.length === 0" class="empty-row">No users.</div>

        <div v-for="u in filteredUsers" :key="u.id" class="trow">
          <div class="username">{{ u.username }}</div>
          <div>
            <div v-if="!isEditing(u)" class="chips">
              <span v-for="(name, idx) in u.role_names" :key="u.id + '-r-' + idx" class="chip">{{
                name
              }}</span>
            </div>
            <div v-else class="roles-box">
              <label
                v-for="r in roles"
                :key="'edit-' + u.id + '-' + r.id"
                class="role-check"
                :class="{ dim: r.is_system && auth.username !== 'admin' }"
                :title="r.code"
              >
                <input
                  type="checkbox"
                  :value="r.id"
                  :checked="editRoleIds.includes(r.id)"
                  @change="toggleRoleInEdit(r.id)"
                />
                <span>{{ r.name }}</span>
                <small class="code">{{ r.code }}</small>
              </label>
            </div>
          </div>

          <div class="text-right actions">
            <template v-if="!isEditing(u)">
              <button class="btn" @click="startEdit(u)">Edit roles</button>
            </template>
            <template v-else>
              <button
                class="btn primary"
                :disabled="savingEdit[u.id] === true"
                @click="saveEdit(u)"
              >
                Save
              </button>
              <button class="btn" @click="cancelEdit">Cancel</button>
            </template>
          </div>
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
