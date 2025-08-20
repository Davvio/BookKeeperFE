<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listParties } from '@/services/partiesApi'
import { sendMessage } from '@/services/messagesApi'
import { api } from '@/services/api'
import { useRoute } from 'vue-router'

const route = useRoute()
const text = ref('')
const kind = ref<'CHAT' | 'TITLE' | 'ACTIONBAR' | 'BOSSBAR'>('CHAT')
const requiresAck = ref(false)
const priority = ref<'NORMAL' | 'HIGH'>('NORMAL')
const toUsers = ref<number[]>([])
const toParties = ref<number[]>([])
const parties = ref<{ id: number; name: string }[]>([])
const users = ref<{ id: number; username: string }[]>([])
const error = ref('')
const done = ref('')

async function load() {
  const { data } = await api.get('/users', { params: { limit: 1000 } })
  users.value = data?.items || data || []
  const lst = await listParties()
  parties.value = lst

  const q = route.query.partyId
  if (q) {
    const pid = Number(q)
    const found = lst.find((p) => p.id === pid)
    if (found) {
      if (toParties.value.indexOf(pid) === -1) toParties.value.push(pid)
    }
  }
}

async function submit() {
  error.value = ''
  done.value = ''
  try {
    await sendMessage({
      text: text.value,
      kind: kind.value,
      requires_ack: requiresAck.value,
      priority: priority.value,
      to_user_ids: toUsers.value,
      to_party_ids: toParties.value,
    })
    text.value = ''
    toUsers.value = []
    toParties.value = []
    done.value = 'Message enqueued.'
  } catch {
    error.value = 'Failed to send'
  }
}
onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-600">Compose Message</h1>
    <div v-if="error" class="text-red-5">{{ error }}</div>
    <div v-if="done" class="text-green-5">{{ done }}</div>

    <div class="grid md:grid-cols-2 gap-3">
      <div class="card">
        <label>Kind</label>
        <select v-model="kind" class="input">
          <option>CHAT</option>
          <option>TITLE</option>
          <option>ACTIONBAR</option>
          <option>BOSSBAR</option>
        </select>
        <label class="mt-2">Priority</label>
        <select v-model="priority" class="input">
          <option>NORMAL</option>
          <option>HIGH</option>
        </select>
        <label class="mt-2">Requires Acknowledgement</label>
        <input type="checkbox" v-model="requiresAck" />
      </div>

      <div class="card">
        <label>Text</label>
        <textarea v-model="text" rows="6" class="input" placeholder="Type your message..." />
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-3">
      <div class="card">
        <h3 class="font-600 mb-2">Users</h3>
        <div class="list">
          <label v-for="u in users" :key="u.id" class="row">
            <input type="checkbox" :value="u.id" v-model="toUsers" />
            <span>{{ u.username }}</span>
          </label>
        </div>
      </div>
      <div class="card">
        <h3 class="font-600 mb-2">Parties</h3>
        <div class="list">
          <label v-for="p in parties" :key="p.id" class="row">
            <input type="checkbox" :value="p.id" v-model="toParties" />
            <span>{{ p.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <button class="btn" @click="submit">Send</button>
  </div>
</template>

<style scoped>
.card {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 14px;
}
.input {
  width: 100%;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 10px;
}
.list {
  max-height: 260px;
  overflow: auto;
  background: var(--bg-primary);
  padding: 8px;
  border-radius: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
}
.btn {
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--accent);
}
</style>
