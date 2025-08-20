<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- src/pages/AdminArea.vue -->
<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useAuth } from '@/stores/auth'

const auth = useAuth()
const isAdmin = computed(() =>
  Boolean(
    (auth as any)?.permissions?.['users.admin'] ||
      (auth as any)?.user?.permissions?.['users.admin'],
  ),
)

// Admin nav (only admin pages here)
type NavItem = { label: string; to: string; icon?: string; adminOnly?: boolean }
const nav: NavItem[] = [
  { label: 'Users & Roles', to: '/admin', icon: '👥', adminOnly: true },
  { label: 'Items Catalog', to: '/admin/items', icon: '🧱' },
  { label: 'Item Valuations', to: '/admin/valuations', icon: '💱', adminOnly: true },
  { label: 'Structure Currency', to: '/admin/structure-currency', icon: '🏛️', adminOnly: true },
  { label: 'Parties/Teams', to: '/admin/parties', icon: '🎉', adminOnly: true },
  { label: 'Messages', to: '/admin/messages', icon: '💬', adminOnly: true },
  // { label: 'RBAC Graph',      to: '/admin/rbac-graph',          icon: '🕸️', adminOnly: true },
]
const visibleNav = computed(() => nav.filter((n) => !n.adminOnly || isAdmin.value))
const sidebarOpen = ref(false)
</script>

<template>
  <div class="admin-shell">
    <!-- Sidebar -->
    <aside :class="['admin-sidebar', sidebarOpen && 'open']">
      <div class="brand"><span class="logo-dot" /> Admin</div>

      <nav class="menu">
        <RouterLink
          v-for="item in visibleNav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          v-slot="{ isActive }"
          @click="sidebarOpen = false"
        >
          <span class="icon" v-if="item.icon">{{ item.icon }}</span>
          <span class="text">{{ item.label }}</span>
          <span class="active-bar" :class="{ show: isActive }" />
        </RouterLink>
      </nav>

      <div class="foot">
        <span class="role" v-if="isAdmin">Admin</span>
        <span class="role" v-else>User</span>
      </div>
    </aside>

    <!-- Main -->
    <main class="admin-content">
      <header class="topbar">
        <button class="burger" @click="sidebarOpen = !sidebarOpen" aria-label="Toggle sidebar">
          ☰
        </button>
        <h1 class="title">Admin Area</h1>
      </header>

      <section class="page">
        <!-- Child admin pages render here -->
        <RouterView />
      </section>
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}
/* Sidebar */
.admin-sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px 12px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 6px 12px;
  font-weight: 700;
}
.logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(92, 106, 196, 0.25);
}
.menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--text-primary);
  text-decoration: none;
  border: 1px solid transparent;
}
.nav-link:hover {
  background: var(--bg-tertiary);
  border-color: rgba(255, 255, 255, 0.08);
}
.nav-link .icon {
  width: 22px;
  text-align: center;
  opacity: 0.9;
}
.nav-link .text {
  flex: 1;
}
.active-bar {
  position: absolute;
  left: -12px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: var(--accent);
  border-radius: 999px;
  opacity: 0;
  transform: scaleY(0.3);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.active-bar.show {
  opacity: 1;
  transform: scaleY(1);
}
.foot {
  margin-top: auto;
  padding-top: 14px;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.role {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* Main */
.admin-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(0deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02));
}
.burger {
  display: none;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
}
.title {
  font-size: 1.05rem;
  opacity: 0.9;
}
.page {
  padding: 14px;
}

/* Responsive */
@media (max-width: 980px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }
  .admin-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: 240px;
    z-index: 30;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }
  .admin-sidebar.open {
    transform: translateX(0%);
  }
  .burger {
    display: inline-block;
  }
}
</style>
