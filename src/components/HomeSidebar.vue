<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useAuth } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
if (!auth.token) auth.init()

type NavItem = { to: string; label: string }

const baseNav: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/trades', label: 'All Trades' },
  { to: '/create-trade', label: 'Create Trade' },
  { to: '/inventory/players', label: 'Player Inventory' },
  { to: '/minecraft/map', label: 'Minecraft Map' },
  // { to: '/admin/rbac', label: 'RBAC Graph' }, // deferred
]

const adminNav: NavItem[] = [{ to: '/admin', label: 'Admin Area' }]
const guildNav: NavItem[] = [
  { to: '/guild', label: 'Guild Master' },
  { to: '/inventory', label: 'Inventory' },
]

const nav = computed<NavItem[]>(() => {
  const items = baseNav.slice()
  // Show admin area if the user has the admin permission
  if (auth.can('users.admin')) items.push(...adminNav)
  // Show guild page for guildmasters or users managing locations
  if (auth.hasRole('GUILDMASTER') || auth.can('locations.manage')) items.push(...guildNav)
  return items
})

function isActive(path: string) {
  return route.path === path
}

function logout() {
  auth.logout(router)
}
</script>

<template>
  <aside
    class="w-60 h-screen bg-[var(--bg-secondary)] flex flex-col py-6 px-4 text-[var(--text-muted)]"
  >
    <h1 class="text-xl font-bold text-[var(--text-primary)] mb-6 px-2">BookKeeper</h1>

    <!-- Navigation -->
    <nav class="flex flex-col gap-2">
      <RouterLink
        v-for="item in nav"
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
          <span v-if="auth.role_codes.length === 0" class="text-xs capitalize">
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
