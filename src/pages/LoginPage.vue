<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const router = useRouter()
const auth = useAuth()

async function login() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    router.push('/')
  } catch {
    error.value = 'Invalid username or password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center h-screen bg-[--bg-primary] text-[--text-primary]">
    <div class="bg-[--bg-secondary] p-8 rounded-lg w-full max-w-md shadow">
      <h1 class="text-2xl font-bold mb-6 text-center">Login</h1>

      <div class="mb-4">
        <label class="block text-sm mb-1">Username</label>
        <input
          v-model="username"
          type="text"
          class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none"
        />
      </div>

      <div class="mb-6">
        <label class="block text-sm mb-1">Password</label>
        <input
          v-model="password"
          type="password"
          class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none"
        />
      </div>

      <button
        @click="login"
        :disabled="loading"
        class="w-full bg-[--accent] hover:opacity-90 py-2 px-4 rounded text-white font-semibold"
      >
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>

      <p v-if="error" class="text-red-400 mt-4 text-center text-sm">{{ error }}</p>
    </div>
  </div>
</template>
