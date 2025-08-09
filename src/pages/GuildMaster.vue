<script setup lang="ts">
import { useAuth } from '@/stores/auth'
const auth = useAuth()
</script>

<template>
  <div class="p-6 space-y-3">
    <h2 class="text-2xl font-bold text-[--text-primary]">Guild Master</h2>
    <p class="text-[--text-muted]">Greetings {{ auth.user?.username }} (role: {{ auth.role }}).</p>

    <div class="grid gap-3">
      <div class="p-4 rounded-lg border border-[--bg-tertiary] bg-[--bg-secondary]">
        <h3 class="font-semibold mb-2">Coming soon</h3>
        <ul class="list-disc pl-5 text-sm">
          <li>Whole-inventory overview</li>
          <li>Storage breakdown by structure</li>
          <li>Player trade activity</li>
        </ul>
      </div>
    </div>
  </div>
</template>
