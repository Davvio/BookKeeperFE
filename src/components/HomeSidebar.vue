<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/trades', label: 'All Trades' },
  { to: '/create-trade', label: 'Create Trade' },
]
</script>

<template>
  <aside class="w-60 h-screen bg-[--bg-secondary] flex flex-col py-6 px-4 text-[--text-muted]">
    <h1 class="text-xl font-bold text-[--text-primary] mb-6 px-2">BookKeeper</h1>

    <nav class="flex flex-col gap-2">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150"
        :class="[
          route.path === item.to
            ? 'bg-[--accent] text-white font-semibold'
            : 'hover:bg-[--bg-tertiary] hover:text-[--text-primary]',
        ]"
      >
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mt-auto px-3 pt-6 border-t border-[--bg-tertiary] text-sm text-[--text-muted]">
      <div class="text-[--text-primary] font-medium">Admin</div>
      <div class="text-xs">Administrator</div>
    </div>
  </aside>
</template>
