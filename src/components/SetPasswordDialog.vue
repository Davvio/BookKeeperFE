<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/stores/auth'

const emit = defineEmits<{
  (e: 'password-set'): void
  (e: 'skip'): void
}>()

const auth = useAuth()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

// Password strength validation
const passwordStrength = computed(() => {
  const pwd = password.value
  if (pwd.length === 0) return { valid: false, message: '', color: 'gray' }

  const hasMinLength = pwd.length >= 8
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)

  const score = [hasMinLength, hasUpper, hasLower, hasNumber].filter(Boolean).length

  if (!hasMinLength) {
    return { valid: false, message: 'Must be at least 8 characters', color: 'red' }
  }

  if (score < 3) {
    return { valid: false, message: 'Weak - add uppercase, lowercase, or numbers', color: 'orange' }
  }

  if (score === 3) {
    return { valid: true, message: 'Good password', color: 'yellow' }
  }

  return { valid: true, message: 'Strong password!', color: 'green' }
})

const passwordsMatch = computed(() => {
  if (confirmPassword.value.length === 0) return true
  return password.value === confirmPassword.value
})

const canSubmit = computed(() => {
  return (
    passwordStrength.value.valid &&
    password.value.length > 0 &&
    passwordsMatch.value &&
    !loading.value
  )
})

async function handleSetPassword() {
  if (!canSubmit.value) return

  loading.value = true
  error.value = ''

  try {
    await auth.setPassword(password.value)
    emit('password-set')
  } catch (e: any) {
    const detail = e?.response?.data?.detail || ''
    error.value = detail || 'Failed to set password. Please try again.'
  } finally {
    loading.value = false
  }
}

function handleSkip() {
  emit('skip')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/70" />
    <div
      class="relative w-[min(560px,92vw)] p-6 rounded-xl bg-[var(--bg-secondary)] shadow-[var(--panel-shadow)]"
    >
      <div class="text-xl font-bold mb-2">Welcome to BookKeeper, {{ auth.username }}!</div>
      <p class="text-sm opacity-80 mb-4">
        Set a password to access the website with your Minecraft username. You can also skip this
        and set it later.
      </p>

      <form @submit.prevent="handleSetPassword" class="space-y-4">
        <!-- Password field -->
        <div>
          <label class="block text-sm mb-1" for="new-password">New Password</label>
          <input
            id="new-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none"
            placeholder="Enter password"
          />
          <p
            v-if="password.length > 0"
            class="text-xs mt-1"
            :class="{
              'text-red-400': passwordStrength.color === 'red',
              'text-orange-400': passwordStrength.color === 'orange',
              'text-yellow-400': passwordStrength.color === 'yellow',
              'text-green-400': passwordStrength.color === 'green',
            }"
          >
            {{ passwordStrength.message }}
          </p>
        </div>

        <!-- Confirm password field -->
        <div>
          <label class="block text-sm mb-1" for="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none"
            placeholder="Confirm password"
          />
          <p v-if="!passwordsMatch" class="text-xs mt-1 text-red-400">Passwords don't match</p>
        </div>

        <!-- Error message -->
        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

        <!-- Buttons -->
        <div class="flex justify-end gap-2 mt-6">
          <button
            type="button"
            class="px-4 py-2 rounded bg-[var(--bg-tertiary)] hover:opacity-90"
            @click="handleSkip"
            :disabled="loading"
          >
            Skip for now
          </button>
          <button
            type="submit"
            class="px-4 py-2 rounded bg-[--accent] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canSubmit"
          >
            {{ loading ? 'Setting...' : 'Set Password' }}
          </button>
        </div>
      </form>

      <p class="text-xs text-gray-500 mt-4">
        <strong>Requirements:</strong> At least 8 characters with uppercase, lowercase, and numbers
      </p>
    </div>
  </div>
</template>
