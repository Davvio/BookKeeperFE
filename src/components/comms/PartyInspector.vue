<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useComms } from '@/stores/comms'
import {
  listMyParties,
  getParty,
  getPartyMembers,
  setPartyLeader,
  setPartyMembers,
  deleteParty,
  type PartyMeOut,
} from '@/services/partiesApi'
import { useAuth } from '@/stores/auth'
import { listUsersLite, type UserLite } from '@/services/usersApi'
import PartyEditor from '@/components/comms/PartyEditor.vue'
import BkSelect from '@/components/BkSelect.vue'

const auth = useAuth()
const comms = useComms()
const partiesMine = ref<PartyMeOut[]>([])
const loading = ref(false)
const editOpen = ref(false)
const allUsers = ref<UserLite[]>([])

function perms(): Record<string, boolean> {
  try {
    const json = JSON.parse(atob((auth.token || '').split('.')[1] || ''))
    return json.permissions || {}
  } catch {
    return {}
  }
}
const isAdmin = computed(() => !!perms()['users.admin'])

async function loadMine() {
  partiesMine.value = await listMyParties()
}
async function loadUsers() {
  allUsers.value = await listUsersLite()
}

onMounted(async () => {
  await Promise.all([loadMine(), loadUsers()])
})

const selectedId = computed(() => comms.selectedPartyId)
const selectedMine = computed(
  () => partiesMine.value.find((p) => p.id === selectedId.value) || null,
)

// Admin can select "other" parties; hydrate lightweight details for them:
const selectedName = ref<string>('') // for ANY party
const selectedDesc = ref<string | null>(null) // for ANY party
const leaderUserId = ref<number | null>(null)
const memberIds = ref<number[]>([])

async function hydrateFromApi(partyId: number) {
  const [p, ids] = await Promise.all([getParty(partyId), getPartyMembers(partyId)])
  selectedName.value = p?.name || `Party #${partyId}`
  selectedDesc.value = p?.description || null
  memberIds.value = ids
  // if you need leader for "other" party, you can expose it later; for now, keep null
  leaderUserId.value = null
}

watch(selectedId, async (id) => {
  if (!id) return
  loading.value = true
  try {
    if (selectedMine.value) {
      const p = selectedMine.value
      selectedName.value = p.name
      selectedDesc.value = p.description || null
      memberIds.value = p.members.map((m) => m.user_id)
      leaderUserId.value = p.leader_user_id ?? null
    } else if (isAdmin.value) {
      await hydrateFromApi(id)
    }
  } finally {
    loading.value = false
  }
})

const userOptions = computed(() => allUsers.value.map((u) => ({ label: u.username, value: u.id })))

function addMemberRow() {
  memberIds.value = [...memberIds.value, null as unknown as number]
}
function removeMemberRow(idx: number) {
  memberIds.value = memberIds.value.filter((_, i) => i !== idx)
}

async function saveLeader() {
  if (!selectedId.value) return
  await setPartyLeader(selectedId.value, leaderUserId.value ?? null)
  await loadMine()
  comms.bumpPartiesVersion() // 👈 notify left list
}

async function saveMembers() {
  if (!selectedId.value) return
  const ids = memberIds.value.filter((v) => typeof v === 'number') as number[]
  await setPartyMembers(selectedId.value, ids)
  await loadMine()
  comms.bumpPartiesVersion() // 👈 notify left list
}

async function destroyParty() {
  if (!selectedId.value) return
  if (!confirm(`Delete party "${selectedName.value}"? This cannot be undone.`)) return
  await deleteParty(selectedId.value)
  await loadMine()
  comms.clear()
  comms.bumpPartiesVersion() // 👈 notify left list
}

// Minimal object for editor regardless of ownership
const partyForEdit = computed(() =>
  selectedId.value
    ? { id: selectedId.value, name: selectedName.value, description: selectedDesc.value }
    : null,
)
</script>

<template>
  <div>
    <h3 class="text-base mb-2">Party</h3>

    <div v-if="!selectedId" class="text-sm opacity-70">Select a party to inspect.</div>
    <div v-else-if="loading" class="text-sm opacity-70">Loading…</div>
    <div v-else class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-lg font-medium truncate">{{ selectedName }}</div>
        <div class="flex gap-2">
          <button
            v-if="isAdmin"
            class="px-2 py-1 text-sm rounded bg-[var(--bg-tertiary)]"
            @click="editOpen = true"
          >
            Edit
          </button>
          <button
            v-if="isAdmin"
            class="px-2 py-1 text-sm rounded bg-red-600 text-white"
            @click="destroyParty"
          >
            Delete
          </button>
        </div>
      </div>

      <!-- Members list (read-only) -->
      <div v-if="selectedMine">
        <div class="text-sm opacity-80">Leader: {{ selectedMine.leader_username || '—' }}</div>
        <div class="text-sm font-medium mb-1">Members</div>
        <ul class="text-sm space-y-1 max-h-[160px] overflow-auto">
          <li
            v-for="m in selectedMine.members"
            :key="m.user_id"
            class="px-2 py-1 rounded bg-[var(--bg-tertiary)]"
          >
            {{ m.username }} <span v-if="m.is_leader" class="opacity-70">(leader)</span>
          </li>
        </ul>
      </div>

      <!-- Admin controls -->
      <div v-if="isAdmin" class="space-y-3 pt-2 border-t border-[var(--bg-tertiary)]">
        <!-- Set/Change Leader -->
        <div>
          <div class="text-sm font-medium mb-1">Set/Change Leader</div>
          <BkSelect v-model="leaderUserId" :items="userOptions" placeholder="Select leader…" />
          <button
            class="mt-2 px-3 py-1 rounded bg-[var(--accent)] text-[var(--bg-primary)]"
            @click="saveLeader"
          >
            Save leader
          </button>
        </div>

        <!-- Members editor -->
        <div>
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">Members</div>
            <button class="px-2 py-1 text-sm rounded bg-[var(--bg-tertiary)]" @click="addMemberRow">
              + Add member
            </button>
          </div>

          <div class="mt-2 space-y-2">
            <div v-for="(val, idx) in memberIds" :key="idx" class="flex items-center gap-2">
              <div class="flex-1 min-w-0">
                <BkSelect
                  v-model="memberIds[idx]"
                  :items="userOptions"
                  placeholder="Select member…"
                />
              </div>
              <button
                class="px-2 py-1 text-sm rounded bg-red-600 text-white"
                @click="removeMemberRow(idx)"
              >
                Remove
              </button>
            </div>
          </div>

          <button
            class="mt-3 px-3 py-1 rounded bg-[var(--accent)] text-[var(--bg-primary)]"
            @click="saveMembers"
          >
            Save members
          </button>
          <div class="text-xs opacity-70 mt-1">Duplicate selections will be ignored</div>
        </div>
      </div>
    </div>

    <PartyEditor
      :open="editOpen"
      mode="edit"
      :party="partyForEdit"
      @close="editOpen = false"
      @saved="
        () => {
          loadMine()
          comms.bumpPartiesVersion()
        }
      "
    />
  </div>
</template>
