<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- src/components/comms/MessageComposer.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useComms } from '@/stores/comms'
import { useAuth } from '@/stores/auth'
import { MESSAGE_KINDS, type MessageKind } from '@/constants/messages'
import { sendOutboxMessage } from '@/services/messagesApi'
import { broadcastMessage } from '@/services/messagesApi'

const comms = useComms()
const auth = useAuth()

// Decode JWT permissions (no extra deps)
function getPerms(): Record<string, boolean> {
  try {
    const parts = (auth.token || '').split('.')
    if (parts.length !== 3) return {}
    const json = JSON.parse(atob(parts[1]))
    return json && json.permissions ? json.permissions : {}
  } catch {
    return {}
  }
}

const perms = computed(getPerms)

// Simple policy: Admin or operators can send; employees see read-only Comms
const canSend = computed(() => {
  const p = perms.value
  return !!(
    p['users.admin'] ||
    p['inventory.admin'] ||
    p['trades.view_all'] ||
    p['locations.manage']
  )
})

const kind = ref<MessageKind>('CHAT')
const text = ref('')

function parseJwt<T = any>(t: string): T | null {
  try {
    return JSON.parse(atob((t || '').split('.')[1] || ''))
  } catch {
    return null
  }
}

const claims = computed(() => parseJwt(auth.token || '') || {})
const structureId = computed(() => (claims.value as any).structure_id || '—')

const targetLabel = computed(() => {
  if (comms.selectedPartyId === -1) return `Broadcast (${structureId.value})`
  if (comms.selectedPartyId) return `Party #${comms.selectedPartyId}`
  if (comms.selectedUserId) return `Player #${comms.selectedUserId}`
  return 'No target selected'
})

async function send() {
  if (!canSend.value) return
  const msg = text.value.trim()
  if (!msg) return

  // --- Broadcast (sentinel partyId === -1) ---
  if (comms.selectedPartyId === -1) {
    if (!confirm(`Send this ${kind.value} to everyone in ${structureId.value}?`)) return
    try {
      await broadcastMessage({
        text: msg,
        kind: kind.value,
        // include these if you expose them in the UI:
        // meta: null,
        // deliver_after: null,
        // expires_at: null,
        // requires_ack: false,
        // priority: 'NORMAL',
      })
      text.value = ''
      alert('Broadcast sent')
    } catch {
      alert('Failed to send broadcast')
    }
    return
  }

  // --- Regular party/player send ---
  if (!comms.selectedPartyId && !comms.selectedUserId) return

  const payload: any = { text: msg, kind: kind.value }
  if (comms.selectedPartyId) payload.to_party_ids = [comms.selectedPartyId]
  if (comms.selectedUserId) payload.to_user_ids = [comms.selectedUserId]

  try {
    await sendOutboxMessage(payload)
    text.value = ''
    alert('Message sent')
  } catch {
    alert('Failed to send message')
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div class="text-sm opacity-80">
        Target: <span class="font-medium">{{ targetLabel }}</span>
      </div>
      <select v-model="kind" class="px-2 py-1 rounded bg-[var(--bg-tertiary)]">
        <option v-for="k in MESSAGE_KINDS" :key="k" :value="k">{{ k }}</option>
      </select>
    </div>

    <textarea
      v-model="text"
      class="mt-2 w-full min-h-[96px] rounded-md p-0 bg-[var(--bg-tertiary)] outline-none"
      placeholder="Type message…"
    />

    <div class="mt-2 flex justify-end">
      <button
        class="px-4 py-2 rounded bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50"
        :disabled="!canSend || !text.trim() || (!comms.selectedPartyId && !comms.selectedUserId)"
        @click="send"
      >
        Send
      </button>
    </div>

    <div v-if="!canSend" class="mt-2 text-xs opacity-70">
      You do not have permission to send messages.
    </div>
  </div>
</template>
