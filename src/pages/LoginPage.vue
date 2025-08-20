<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const usernameEl = ref<HTMLInputElement | null>(null)

const redirectPath = computed(() => {
  const q = route.query.redirect
  // Only allow internal redirects (defensive)
  return typeof q === 'string' && q.startsWith('/') ? q : '/'
})

const canSubmit = computed(() => {
  return username.value.trim().length > 0 && password.value.length > 0 && !loading.value
})

async function login() {
  if (!canSubmit.value) return
  error.value = ''
  loading.value = true
  try {
    // Uses your existing auth store login; it should set token & user info
    await auth.login(username.value.trim(), password.value)
    router.replace(redirectPath.value)
  } catch (e: any) {
    // Try to surface a good message; fall back to generic
    const code = e?.response?.status ?? e?.status
    if (code === 401) error.value = 'Invalid username or password.'
    else error.value = e?.response?.data?.detail || 'Unable to sign in right now.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Rehydrate if your store supports it
  ;(auth as any).initFromStorage?.()
  // If already authenticated and not expired, skip the login screen
  if ((auth as any).isAuthenticated && !(auth as any).isExpired) {
    router.replace(redirectPath.value)
    return
  }
  // Focus the username field
  usernameEl.value?.focus()
})
</script>

<template>
  <div
    class="flex items-center justify-center min-h-screen bg-[--bg-primary] text-[--text-primary]"
  >
    <div class="bg-[--bg-secondary] p-8 rounded-lg w-full max-w-md shadow">
      <h1 class="text-2xl font-bold mb-6 text-center">Login</h1>

      <form @submit.prevent="login" class="space-y-4">
        <div>
          <label class="block text-sm mb-1" for="username">Username</label>
          <input
            id="username"
            ref="usernameEl"
            v-model="username"
            type="text"
            autocomplete="username"
            class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none"
          />
        </div>

        <div>
          <label class="block text-sm mb-1" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none"
          />
        </div>

        <button
          type="submit"
          :disabled="!canSubmit"
          class="w-full bg-[--accent] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed py-2 px-4 rounded text-white font-semibold"
        >
          {{ loading ? 'Logging in…' : 'Login' }}
        </button>

        <p v-if="error" class="text-red-400 mt-2 text-center text-sm">{{ error }}</p>
      </form>

      <p v-if="route.query.redirect" class="text-xs text-gray-400 mt-4 text-center">
        You’ll be redirected to <span class="font-mono">{{ redirectPath }}</span> after login.
      </p>
    </div>
  </div>
</template>
