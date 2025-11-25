<template>
  <div class="page-container">
    <h1 class="page-title">Nations & Factions</h1>
    <p class="page-subtitle">Choose a nation to join and become part of their community</p>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading nations...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="success-banner">
      {{ successMessage }}
    </div>

    <!-- Current Status -->
    <div v-if="auth.structure_id" class="current-status">
      <div v-if="auth.membership_status === 'guest'" class="status-pending">
        <strong>⏳ Pending Approval</strong>
        <p>You have requested to join a nation. Waiting for admin approval...</p>
        <button @click="handleLeave" :disabled="leaving" class="btn-danger btn-sm">
          {{ leaving ? 'Leaving...' : 'Cancel Request' }}
        </button>
      </div>
      <div v-else-if="auth.membership_status === 'member'" class="status-member">
        <strong>✓ Current Nation</strong>
        <p>You are a member of your nation. Leave to join another nation.</p>
        <button @click="handleLeave" :disabled="leaving" class="btn-warning btn-sm">
          {{ leaving ? 'Leaving...' : 'Leave Nation' }}
        </button>
      </div>
    </div>

    <!-- Nations Grid -->
    <div v-else-if="!loading && structures.length > 0" class="nations-grid">
      <div
        v-for="structure in structures"
        :key="structure.id"
        class="nation-card"
        :class="{ disabled: !structure.canJoin }"
      >
        <div class="nation-header">
          <h2 class="nation-name">{{ structure.displayName }}</h2>
          <span class="member-count">👥 {{ structure.memberCount }} members</span>
        </div>

        <p v-if="structure.description" class="nation-description">
          {{ structure.description }}
        </p>
        <p v-else class="nation-description no-description">
          No description available
        </p>

        <div class="nation-footer">
          <button
            v-if="structure.canJoin"
            @click="handleJoin(structure)"
            :disabled="joiningId === structure.id"
            class="btn-primary"
          >
            {{ joiningId === structure.id ? 'Joining...' : 'Request to Join' }}
          </button>
          <button v-else disabled class="btn-disabled">
            Cannot Join
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && structures.length === 0" class="empty-state">
      <p>No nations are currently available to join.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '@/stores/auth'
import {
  getPublicStructures,
  requestJoinStructure,
  leaveStructure,
  type PublicStructure,
} from '@/services/structuresApi'

const auth = useAuth()
const structures = ref<PublicStructure[]>([])
const loading = ref(true)
const error = ref('')
const successMessage = ref('')
const joiningId = ref<string | null>(null)
const leaving = ref(false)

async function loadStructures() {
  loading.value = true
  error.value = ''

  try {
    const response = await getPublicStructures()
    structures.value = response.structures
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to load nations'
  } finally {
    loading.value = false
  }
}

async function handleJoin(structure: PublicStructure) {
  if (joiningId.value) return

  if (!confirm(`Request to join ${structure.displayName}?`)) {
    return
  }

  joiningId.value = structure.id
  error.value = ''
  successMessage.value = ''

  try {
    const response = await requestJoinStructure(structure.id)
    successMessage.value = response.message

    // Update auth store
    auth.structure_id = response.structureId
    auth.membership_status = 'guest'
    auth._persist()

    // Reload structures to update UI
    await loadStructures()
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to join nation'
  } finally {
    joiningId.value = null
  }
}

async function handleLeave() {
  if (leaving.value) return

  const confirmMessage =
    auth.membership_status === 'guest'
      ? 'Cancel your join request?'
      : 'Leave your nation? You will lose all privileges and roles.'

  if (!confirm(confirmMessage)) {
    return
  }

  leaving.value = true
  error.value = ''
  successMessage.value = ''

  try {
    await leaveStructure()
    successMessage.value = 'Successfully left nation'

    // Update auth store
    auth.structure_id = ''
    auth.membership_status = 'unassigned'
    auth.role_codes = []
    auth._persist()

    // Reload structures to update UI
    await loadStructures()
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to leave nation'
  } finally {
    leaving.value = false
  }
}

onMounted(() => {
  loadStructures()
})
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1rem;
  opacity: 0.7;
  margin-bottom: 2rem;
}

.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid var(--accent);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.success-banner {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.current-status {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.status-pending {
  color: #f59e0b;
}

.status-member {
  color: #22c55e;
}

.current-status strong {
  display: block;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.current-status p {
  margin-bottom: 1rem;
  opacity: 0.8;
}

.nations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.nation-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.nation-card:not(.disabled):hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.nation-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.nation-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.nation-name {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0;
}

.member-count {
  font-size: 0.875rem;
  opacity: 0.7;
  white-space: nowrap;
}

.nation-description {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 1.5rem;
  min-height: 3rem;
}

.nation-description.no-description {
  font-style: italic;
  opacity: 0.5;
}

.nation-footer {
  display: flex;
  justify-content: flex-end;
}

.btn-primary,
.btn-danger,
.btn-warning,
.btn-disabled,
.btn-sm {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-disabled {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  opacity: 0.7;
}
</style>
