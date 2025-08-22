<!-- src/components/HomeSidebar.vue -->
<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useAuth } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
// Rehydrate once per app start (mirrors index.ts guard)
if (!auth.token) auth.initFromStorage?.()

type NavItem = { to: string; label: string }

const primaryNav: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/trades', label: 'All Trades' },
  { to: '/create-trade', label: 'Create Trade' },
  { to: '/comms', label: 'Communications' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/inventory/players', label: 'Player Inventory' },
]

const dataNav: NavItem[] = [
  { to: '/items', label: 'Items' },
  { to: '/valuations', label: 'Valuations' },
  { to: '/locations', label: 'Locations' },
]

const adminNav: NavItem[] = [{ to: '/admin', label: 'Admin Area' }]

// flat list if you really want it, but we'll render grouped below
const nav = computed(() => [...primaryNav, ...dataNav])

function isActive(path: string) {
  // Exact for most, prefix for /admin (so /admin/users-roles highlights)
  if (path === '/admin') return route.path.startsWith('/admin')
  return route.path === path
}

async function logout() {
  await auth.logout()
  const redirect = encodeURIComponent(route.fullPath)
  router.replace(`/login?redirect=${redirect}`)
}
</script>

<template>
  <aside
    class="w-60 h-screen bg-[var(--bg-secondary)] flex flex-col py-6 px-4 text-[var(--text-muted)]"
  >
    <h1 class="text-xl font-bold text-[var(--text-primary)] mb-6 px-2">BookKeeper</h1>

    <!-- Primary -->
    <div class="mb-3">
      <div class="px-3 pb-1 text-xs uppercase tracking-wide opacity-60">Primary</div>
      <nav class="flex flex-col gap-2">
        <RouterLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150"
          :class="[
            isActive(item.to)
              ? 'bg-[var(--accent)] text-white font-semibold'
              : 'hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
          ]"
        >
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <!-- Data -->
    <div class="mb-3">
      <div class="px-3 pb-1 text-xs uppercase tracking-wide opacity-60">Data</div>
      <nav class="flex flex-col gap-2">
        <RouterLink
          v-for="item in dataNav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150"
          :class="[
            isActive(item.to)
              ? 'bg-[var(--accent)] text-white font-semibold'
              : 'hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
          ]"
        >
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <!-- Admin -->
    <div v-if="auth.isAdmin" class="mb-3">
      <div class="px-3 pb-1 text-xs uppercase tracking-wide opacity-60">Admin</div>
      <nav class="flex flex-col gap-2">
        <RouterLink
          v-for="item in adminNav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150"
          :class="[
            isActive(item.to)
              ? 'bg-[var(--accent)] text-white font-semibold'
              : 'hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
          ]"
        >
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <!-- Footer -->
    <div class="mt-auto px-3 pt-6 border-t border-[var(--bg-tertiary)] text-sm flex flex-col gap-2">
      <div>
        <div class="text-[var(--text-primary)] font-medium">
          {{ auth.username || 'User' }}
        </div>

        <!-- Role chips -->
        <div class="mt-1 flex flex-wrap gap-1">
          <span v-for="code in auth.role_codes" :key="code" class="role-chip" :title="code">
            {{ code }}
          </span>
          <span v-if="auth.role_codes?.length === 0" class="text-xs capitalize">
            {{ (auth.primaryRole || 'EMPLOYEE').toLowerCase() }}
          </span>
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

<style scoped>
.role-chip {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
}
</style>
