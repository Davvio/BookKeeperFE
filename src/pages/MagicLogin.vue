<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'
import SetPasswordDialog from '@/components/SetPasswordDialog.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const loading = ref(true)
const error = ref('')
const showPasswordDialog = ref(false)

async function performMagicLogin() {
  const token = route.params.token as string

  if (!token) {
    error.value = 'No magic token provided'
    loading.value = false
    return
  }

  try {
    const result = await auth.magicLogin(token)

    // If user doesn't have a password yet, prompt them to set one
    if (!result.hasPassword) {
      showPasswordDialog.value = true
    } else {
      // Redirect to dashboard immediately
      router.replace('/')
    }
  } catch (e: any) {
    const status = e?.response?.status
    const detail = e?.response?.data?.detail || ''

    if (status === 401) {
      if (detail.includes('expired')) {
        error.value = 'This magic link has expired. Please request a new one from Minecraft.'
      } else if (detail.includes('used')) {
        error.value = 'This magic link has already been used.'
      } else {
        error.value = 'Invalid magic link token.'
      }
    } else {
      error.value = 'Unable to log in. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

function onPasswordSet() {
  showPasswordDialog.value = false
  // Redirect to dashboard after password is set
  router.replace('/')
}

function onPasswordSkip() {
  showPasswordDialog.value = false
  // User chose not to set password now, still redirect
  router.replace('/')
}

onMounted(() => {
  performMagicLogin()
})
</script>

<template>
  <div
    class="flex items-center justify-center min-h-screen bg-[--bg-primary] text-[--text-primary]"
  >
    <div class="bg-[--bg-secondary] p-8 rounded-lg w-full max-w-md shadow">
      <h1 class="text-2xl font-bold mb-6 text-center">Magic Login</h1>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[--accent]"></div>
        <p class="mt-4 text-gray-400">Logging you in...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8">
        <svg
          class="mx-auto h-16 w-16 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p class="mt-4 text-red-400 font-semibold">{{ error }}</p>
        <p class="mt-2 text-sm text-gray-400">
          Please join Minecraft again to get a new magic link.
        </p>
        <button
          @click="router.push('/login')"
          class="mt-6 px-4 py-2 bg-[--bg-tertiary] hover:opacity-90 rounded text-sm"
        >
          Go to Login Page
        </button>
      </div>

      <!-- Success State (will show briefly before redirect) -->
      <div v-else class="text-center py-8">
        <svg
          class="mx-auto h-16 w-16 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="mt-4 text-green-400 font-semibold">Login successful!</p>
        <p class="mt-2 text-sm text-gray-400">Redirecting...</p>
      </div>
    </div>

    <!-- Password Setup Dialog -->
    <SetPasswordDialog
      v-if="showPasswordDialog"
      @password-set="onPasswordSet"
      @skip="onPasswordSkip"
    />
  </div>
</template>
