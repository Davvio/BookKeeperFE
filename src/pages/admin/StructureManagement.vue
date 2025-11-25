<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '@/stores/auth'
import {
  createJoinCode,
  listJoinCodes,
  revokeJoinCode,
  type JoinCode,
} from '@/services/structuresApi'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const auth = useAuth()

const codes = ref<JoinCode[]>([])
const loading = ref(true)
const createLoading = ref(false)
const error = ref('')

// Create code form
const expiresInDays = ref<number | null>(null)
const maxUses = ref<number | null>(null)

// Delete confirmation
const deleteTarget = ref<JoinCode | null>(null)
const showDeleteConfirm = ref(false)

const hasStructure = computed(() => !!auth.structure_id)

async function loadCodes() {
  if (!auth.structure_id) {
    error.value = 'No structure assigned'
    loading.value = false
    return
  }

  try {
    codes.value = await listJoinCodes(auth.structure_id)
  } catch (e: any) {
    error.value = e?.response?.data?.detail || 'Failed to load join codes'
  } finally {
    loading.value = false
  }
}

async function handleCreateCode() {
  if (!auth.structure_id) return

  createLoading.value = true
  error.value = ''

  try {
    const options = {
      expiresInDays: expiresInDays.value || undefined,
      maxUses: maxUses.value || undefined,
    }

    await createJoinCode(auth.structure_id, options)

    // Reload codes
    await loadCodes()

    // Reset form
    expiresInDays.value = null
    maxUses.value = null
  } catch (e: any) {
    error.value = e?.response?.data?.detail || 'Failed to create join code'
  } finally {
    createLoading.value = false
  }
}

function confirmDelete(code: JoinCode) {
  deleteTarget.value = code
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deleteTarget.value || !auth.structure_id) return

  try {
    await revokeJoinCode(auth.structure_id, deleteTarget.value.id)

    // Remove from list
    codes.value = codes.value.filter((c) => c.id !== deleteTarget.value!.id)

    showDeleteConfirm.value = false
    deleteTarget.value = null
  } catch (e: any) {
    error.value = e?.response?.data?.detail || 'Failed to revoke code'
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isExpired(code: JoinCode): boolean {
  if (!code.expiresAt) return false
  return new Date(code.expiresAt) < new Date()
}

function isMaxedOut(code: JoinCode): boolean {
  if (!code.maxUses) return false
  return code.usedCount >= code.maxUses
}

function getStatus(code: JoinCode): { label: string; color: string } {
  if (!code.isActive) return { label: 'Revoked', color: 'text-red-400' }
  if (isExpired(code)) return { label: 'Expired', color: 'text-orange-400' }
  if (isMaxedOut(code)) return { label: 'Maxed Out', color: 'text-yellow-400' }
  return { label: 'Active', color: 'text-green-400' }
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    // Could add a toast notification here
  } catch {
    // Fallback: select text
  }
}

onMounted(() => {
  loadCodes()
})
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Structure Join Codes</h1>

    <div v-if="!hasStructure" class="p-4 bg-yellow-900/30 border border-yellow-700 rounded">
      <p class="text-yellow-400">You are not currently in a structure.</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Create Code Section -->
      <div class="bg-[--bg-secondary] p-6 rounded-lg">
        <h2 class="text-lg font-semibold mb-4">Create New Join Code</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">Expires in (days)</label>
            <input
              v-model.number="expiresInDays"
              type="number"
              min="1"
              placeholder="Never"
              class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
          </div>

          <div>
            <label class="block text-sm mb-1">Max Uses</label>
            <input
              v-model.number="maxUses"
              type="number"
              min="1"
              placeholder="Unlimited"
              class="w-full p-2 bg-[--bg-tertiary] border border-gray-700 rounded outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
          </div>

          <div class="flex items-end">
            <button
              @click="handleCreateCode"
              :disabled="createLoading"
              class="w-full bg-[--accent] hover:opacity-90 disabled:opacity-60 py-2 px-4 rounded text-white font-semibold"
            >
              {{ createLoading ? 'Creating...' : 'Create Code' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="mt-4 text-red-400 text-sm">{{ error }}</p>
      </div>

      <!-- Codes List -->
      <div class="bg-[--bg-secondary] p-6 rounded-lg">
        <h2 class="text-lg font-semibold mb-4">Existing Codes</h2>

        <div v-if="loading" class="text-center py-8 text-gray-400">Loading...</div>

        <div v-else-if="codes.length === 0" class="text-center py-8 text-gray-400">
          No join codes yet. Create one above to invite members.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="code in codes"
            :key="code.id"
            class="p-4 bg-[--bg-tertiary] rounded-lg flex items-center justify-between"
          >
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <button
                  @click="copyCode(code.code)"
                  class="font-mono text-lg font-bold hover:text-[--accent] transition"
                  title="Click to copy"
                >
                  {{ code.code }}
                </button>
                <span :class="getStatus(code).color" class="text-sm font-semibold">
                  {{ getStatus(code).label }}
                </span>
              </div>

              <div class="mt-2 text-sm text-gray-400 space-y-1">
                <div class="flex gap-4">
                  <span>Used: {{ code.usedCount }}{{ code.maxUses ? ` / ${code.maxUses}` : '' }}</span>
                  <span v-if="code.expiresAt">Expires: {{ formatDate(code.expiresAt) }}</span>
                  <span v-else>Expires: Never</span>
                </div>
                <div class="text-xs">Created: {{ formatDate(code.createdAt) }}</div>
              </div>
            </div>

            <button
              v-if="code.isActive"
              @click="confirmDelete(code)"
              class="ml-4 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
            >
              Revoke
            </button>
            <span v-else class="ml-4 px-3 py-2 text-gray-500 text-sm">
              Revoked
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Revoke Join Code?"
      :message="`Are you sure you want to revoke code ${deleteTarget?.code}?\n\nThis code will no longer work for new members.`"
      confirm-label="Revoke"
      cancel-label="Cancel"
      @confirm="handleDelete"
      @close="showDeleteConfirm = false"
    />
  </div>
</template>
