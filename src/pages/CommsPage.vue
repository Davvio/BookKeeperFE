<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<!-- src/pages/CommsPage.vue -->
<script setup lang="ts">
import PartyList from '@/components/comms/PartyList.vue'
import PlayerList from '@/components/comms/PlayerList.vue'
import InboxView from '@/components/comms/InboxView.vue'
import OutboxView from '@/components/comms/OutboxView.vue'
import PartyInspector from '@/components/comms/PartyInspector.vue'
import MessageComposer from '@/components/comms/MessageComposer.vue'
import PartyEditor from '@/components/comms/PartyEditor.vue'
import { useComms } from '@/stores/comms'

import { ref, computed } from 'vue'
import { useAuth } from '@/stores/auth'

const auth = useAuth()
if (!auth.token) auth.initFromStorage?.()

const comms = useComms()

function hasPerm(key: string) {
  try {
    const json = JSON.parse(atob((auth.token || '').split('.')[1] || '')) || {}
    return !!json.permissions?.[key]
  } catch {
    return false
  }
}
const isAdmin = computed(() => auth.hasRole?.('ADMIN') || hasPerm('users.admin'))

// modal state + a key to force PartyList to reload after creating
const createOpen = ref(false)
const partyRefreshKey = ref(0)

function selectBroadcast() {
  comms.selectedPartyId = -1 as any
  comms.selectedUserId = null
}

function onPartyCreated(/*party?: any*/) {
  createOpen.value = false
  partyRefreshKey.value += 1 // remount <PartyList> to refetch
}

const inboxRef = ref<InstanceType<typeof InboxView> | null>(null)
</script>

<template>
  <div class="p-4 grid gap-4 md:grid-cols-[280px_1fr_320px]">
    <!-- Left -->
    <aside class="flex flex-col gap-4 min-w-0">
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm opacity-80">Parties</div>
          <button
            v-if="isAdmin"
            class="btn btn--sm"
            @click="createOpen = true"
            title="Create a new party"
          >
            + New
          </button>
        </div>

        <PartyList class="bg-[var(--bg-secondary)] rounded-xl p-3" :key="partyRefreshKey">
          <template #actions>
            <button
              v-if="isAdmin"
              class="px-2 py-1 text-xs rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]"
              title="Broadcast to everyone in your structure"
              @click="selectBroadcast"
            >
              Broadcast
            </button>
          </template>
        </PartyList>
      </div>
      <PlayerList class="bg-[var(--bg-secondary)] rounded-xl p-3" />
    </aside>

    <!-- Center -->
    <section class="flex flex-col gap-4 min-h-[60vh]">
      <div class="bg-[var(--bg-secondary)] rounded-xl p-3 min-w-0">
        <div class="flex items-center gap-4 mb-3">
          <h2 class="text-lg">Inbox</h2>
          <button
            class="px-2 py-1 text-sm rounded bg-[var(--bg-tertiary)]"
            @click="inboxRef?.refresh()"
          >
            Refresh
          </button>
        </div>
        <InboxView ref="inboxRef" />
      </div>

      <div class="bg-[var(--bg-secondary)] rounded-xl p-3">
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg">Outbox</h2>
        </div>
        <OutboxView />
      </div>

      <MessageComposer class="bg-[var(--bg-secondary)] rounded-xl p-3 sticky bottom-0" />
    </section>

    <!-- Right -->
    <aside class="bg-[var(--bg-secondary)] rounded-xl p-3 min-w-0">
      <PartyInspector />
    </aside>

    <div v-if="createOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/55" @click="createOpen = false" />

      <!-- PartyEditor already handles member picking + leader selection -->
      <PartyEditor
        :open="true"
        :party="null"
        mode="create"
        @saved="onPartyCreated"
        @cancel="createOpen = false"
        @close="createOpen = false"
      />
    </div>
  </div>
</template>
