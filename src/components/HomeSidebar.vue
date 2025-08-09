<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useAuth } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
if (!auth.token) auth.init()

const baseNav = [
  { to: '/', label: 'Dashboard' },
  { to: '/trades', label: 'All Trades' },
  { to: '/create-trade', label: 'Create Trade' },
]

const adminNav = [{ to: '/admin', label: 'Admin Area' }]
const guildNav = [{ to: '/guild', label: 'Guild Master' }]

const nav = computed(() => {
  const items = baseNav.slice()
  if (auth.role === 'ADMIN') items.push(...adminNav)
  if (auth.role === 'GUILDMASTER') items.push(...guildNav)
  return items
})

function isActive(path: string) {
  return route.path === path
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="w-60 h-screen bg-[--bg-secondary] flex flex-col py-6 px-4 text-[--text-muted]">
    <h1 class="text-xl font-bold text-[--text-primary] mb-6 px-2">BookKeeper</h1>

    <!-- Navigation -->
    <nav class="flex flex-col gap-2">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150"
        :class="[
          isActive(item.to)
            ? 'bg-[--accent] text-white font-semibold'
            : 'hover:bg-[--bg-tertiary] hover:text-[--text-primary]',
        ]"
      >
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- Footer -->
    <div class="mt-auto px-3 pt-6 border-t border-[--bg-tertiary] text-sm flex flex-col gap-2">
      <div>
        <div class="text-[--text-primary] font-medium">
          {{ auth.user?.username || 'User' }}
        </div>
        <div class="text-xs capitalize">
          {{ (auth.role || 'employee').toLowerCase() }}
        </div>
      </div>

      <!-- Logout -->
      <button
        @click="logout"
        class="mt-2 px-3 py-2 text-left rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
      >
        Logout
      </button>
    </div>
  </aside>
</template>
