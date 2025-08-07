<script setup lang="ts">
import Sidebar from '../components/HomeSidebar.vue'
import TopBar from '../components/TopBar.vue'
</script>

<template>
  <div class="h-screen flex text-[var(--text-primary)]">
    <Sidebar />
    <div class="flex-1 flex flex-col bg-[var(--bg-primary)]">
      <TopBar />
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
