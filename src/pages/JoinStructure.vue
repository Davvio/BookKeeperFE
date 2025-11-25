<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { joinStructure } from '@/services/structuresApi'

const router = useRouter()
const auth = useAuth()

const joinCode = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const canSubmit = computed(() => {
  return joinCode.value.trim().length > 0 && !loading.value
})

async function handleJoin() {
  if (!canSubmit.value) return

  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const result = await joinStructure(joinCode.value.trim().toUpperCase())

    // Update the auth store with new structure ID
    auth.structure_id = result.structureId
    auth._persist()

    success.value = result.message

    // Redirect to dashboard after a brief delay
    setTimeout(() => {
      router.push('/')
    }, 2000)
  } catch (e: any) {
    const status = e?.response?.status
    const detail = e?.response?.data?.detail || ''

    if (status === 400) {
      if (detail.includes('Invalid or inactive')) {
        error.value = 'Invalid or inactive join code. Please check the code and try again.'
      } else if (detail.includes('already in structure')) {
        error.value = detail
      } else if (detail.includes('expired')) {
        error.value = 'This join code has expired.'
      } else {
        error.value = detail || 'Invalid join code.'
      }
    } else if (status === 401) {
      error.value = 'You must be logged in to join a structure.'
      setTimeout(() => router.push('/login'), 2000)
    } else {
      error.value = 'Unable to join structure. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div
    class="flex items-center justify-center min-h-screen bg-[--bg-primary] text-[--text-primary]"
  >
    <div class="bg-[--bg-secondary] p-8 rounded-lg w-full max-w-md shadow">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Join a Structure</h1>
        <button
          @click="goBack"
          class="text-gray-400 hover:text-white"
          title="Go back"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <p class="text-sm text-gray-400 mb-6">
        Enter an invite code from a structure admin to join their organization.
      </p>

      <form @submit.prevent="handleJoin" class="space-y-4">
        <div>
          <label class="block text-sm mb-1" for="join-code">Invite Code</label>
          <input
            id="join-code"
            v-model="joinCode"
            type="text"
            placeholder="GPR-6ORQEY"
            class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none uppercase font-mono text-center text-lg tracking-wider"
            maxlength="16"
            autofocus
          />
          <p class="text-xs text-gray-500 mt-1">
            Code format: XXX-XXXXXX (e.g., GPR-6ORQEY)
          </p>
        </div>

        <!-- Success message -->
        <div v-if="success" class="p-3 bg-green-900/30 border border-green-700 rounded">
          <div class="flex items-start gap-2">
            <svg
              class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
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
            <p class="text-sm text-green-400">{{ success }}</p>
          </div>
          <p class="text-xs text-green-300 mt-2">Redirecting to dashboard...</p>
        </div>

        <!-- Error message -->
        <div v-if="error" class="p-3 bg-red-900/30 border border-red-700 rounded">
          <div class="flex items-start gap-2">
            <svg
              class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>
        </div>

        <button
          type="submit"
          :disabled="!canSubmit || !!success"
          class="w-full bg-[--accent] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed py-2 px-4 rounded text-white font-semibold"
        >
          {{ loading ? 'Joining...' : 'Join Structure' }}
        </button>
      </form>

      <div class="mt-6 p-4 bg-[--bg-tertiary] rounded text-sm">
        <p class="font-semibold mb-2">How to get an invite code:</p>
        <ul class="list-disc list-inside text-gray-400 space-y-1">
          <li>Ask a structure admin or owner</li>
          <li>Use <code class="bg-[--bg-primary] px-1 rounded font-mono">/join CODE</code> in Minecraft</li>
          <li>Codes may expire or have usage limits</li>
        </ul>
      </div>
    </div>
  </div>
</template>
