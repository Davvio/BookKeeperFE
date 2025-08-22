<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getParty,
  getPartyMembers,
  setPartyMembers,
  updateParty,
  setPartyLeader,
} from '../services/partiesApi'
import { useRoute } from 'vue-router'
import { api } from '@/services/api' // to list users (reuse existing users endpoint if present)
import router from '@/router'

const route = useRoute()
const id = Number(route.params.id)
const loading = ref(false)
const error = ref('')
const party = ref<any>(null)
const members = ref<number[]>([])
const allUsers = ref<{ id: number; username: string }[]>([])
const name = ref('')
const description = ref('')
const leader = ref<number | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    party.value = await getParty(id)
    name.value = party.value.name
    description.value = party.value.description || ''
    leader.value = party.value.leader_user_id || null

    members.value = await getPartyMembers(id)
    const { data } = await api.get('/users', { params: { limit: 1000 } }) // adjust to your users list API
    allUsers.value = data?.items || data || []
  } catch {
    error.value = 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function saveMeta() {
  await updateParty(id, { name: name.value, description: description.value || undefined })
  await load()
}
async function saveMembers() {
  await setPartyMembers(id, members.value)
  await load()
}
async function saveLeader() {
  await setPartyLeader(id, leader.value)
  await load()
}

function sendMsgToParty() {
  router.push({ path: '/admin/messages/compose', query: { partyId: String(id) } })
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-600">Party #{{ id }}</h1>
    <div v-if="error" class="text-red-5">{{ error }}</div>

    <div class="grid gap-3 md:grid-cols-3">
      <div class="card md:col-span-2">
        <h2 class="font-600 mb-2">Details</h2>
        <label>Name</label>
        <input v-model="name" class="input" />
        <label class="mt-2">Description</label>
        <input v-model="description" class="input" />
        <button class="btn mt-3" @click="saveMeta">Save</button>
      </div>

      <div class="card">
        <h2 class="font-600 mb-2">Leader</h2>
        <select v-model="leader" class="input">
          <option :value="null">— none —</option>
          <option v-for="u in allUsers" :key="u.id" :value="u.id">{{ u.username }}</option>
        </select>
        <button class="btn mt-3" @click="saveLeader">Save Leader</button>
        <button class="btn mt-3" @click="sendMsgToParty">Send message to this party</button>
      </div>
    </div>

    <div class="card">
      <h2 class="font-600 mb-2">Members</h2>
      <div
        class="flex flex-col gap-2 max-h-80 overflow-auto p-2 bg-[var(--bg-secondary)] rounded-xl"
      >
        <label v-for="u in allUsers" :key="u.id" class="flex items-center gap-2">
          <input type="checkbox" :value="u.id" v-model="members" />
          <span>{{ u.username }}</span>
        </label>
      </div>
      <button class="btn mt-3" @click="saveMembers">Save Members</button>
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 14px;
}
.input {
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 10px;
}
.btn {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--accent);
}
</style>
