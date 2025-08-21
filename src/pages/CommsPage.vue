<!-- src/pages/CommsPage.vue -->
<script setup lang="ts">
import PartyList from '@/components/comms/PartyList.vue'
import PlayerList from '@/components/comms/PlayerList.vue'
import InboxView from '@/components/comms/InboxView.vue'
import OutboxView from '@/components/comms/OutboxView.vue'
import PartyInspector from '@/components/comms/PartyInspector.vue'
import MessageComposer from '@/components/comms/MessageComposer.vue'
import { ref } from 'vue'

const inboxRef = ref<InstanceType<typeof InboxView> | null>(null)
</script>

<template>
  <div class="p-4 grid gap-4 md:grid-cols-[280px_1fr_320px]">
    <!-- Left -->
    <aside class="flex flex-col gap-4 min-w-0">
      <PartyList class="bg-[var(--bg-secondary)] rounded-xl p-3" />
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
  </div>
</template>
