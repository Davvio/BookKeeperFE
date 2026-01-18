<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'

// Reuse your existing pages as children
import Inventory from '@/pages/Inventory.vue'
import PlayerInventory from '@/pages/PlayerInventory.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

// ----- Tabs
type TabKey = 'inv' | 'players'
const tab = ref<TabKey>((route.query.tab as TabKey) || 'inv')

watch(tab, (t) => {
  const q = { ...route.query, tab: t }
  router.replace({ query: q })
})

// Ensure query param reflects default on first load
onMounted(() => {
  if (!route.query.tab) {
    router.replace({ query: { ...route.query, tab: tab.value } })
  }
})
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center gap-3">
      <h1 class="text-xl">Inventory</h1>

      <div class="ml-auto flex items-center gap-2">
        <button class="tab" :class="{ 'tab--active': tab === 'inv' }" @click="tab = 'inv'">
          By Item / By Location
        </button>

        <button class="tab" :class="{ 'tab--active': tab === 'players' }" @click="tab = 'players'">
          Player Inventory
        </button>
      </div>
    </div>

    <div>
      <div v-show="tab === 'inv'">
        <!-- Your current Inventory page already has its own internal tabs (By Item/By Location) -->
        <Inventory />
      </div>

      <div v-show="tab === 'players'">
        <PlayerInventory />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
}
.tab--active {
  background: var(--accent);
  color: var(--bg-primary);
}
.card {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 12px;
}
.text-xl {
  font-size: 1.25rem;
}
</style>
