<template>
  <div class="player-management">
    <h1 class="page-title">Player Management</h1>
    <p class="page-subtitle">Add unassigned players or approve pending join requests</p>

    <!-- Error/Success Messages -->
    <div v-if="error" class="error-banner">{{ error }}</div>
    <div v-if="successMessage" class="success-banner">{{ successMessage }}</div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading players...</p>
    </div>

    <!-- Tabs -->
    <div v-else class="tabs">
      <button
        @click="activeTab = 'guests'"
        :class="['tab', { active: activeTab === 'guests' }]"
      >
        Pending Requests ({{ guests.length }})
      </button>
      <button
        @click="activeTab = 'unassigned'"
        :class="['tab', { active: activeTab === 'unassigned' }]"
      >
        Unassigned Players ({{ unassignedPlayers.length }})
      </button>
    </div>

    <!-- Guests Table (Pending Approval) -->
    <div v-if="activeTab === 'guests'" class="table-container">
      <h2 class="section-title">Pending Join Requests</h2>
      <p v-if="guests.length === 0" class="empty-message">
        No pending join requests
      </p>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>MC UUID</th>
            <th>Has Password</th>
            <th>Requested</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="guest in guests" :key="guest.userId">
            <td><strong>{{ guest.username }}</strong></td>
            <td class="text-mono">{{ guest.mcUuid.substring(0, 8) }}...</td>
            <td>
              <span class="badge badge-warning">No</span>
            </td>
            <td>{{ formatDate(guest.createdAt) }}</td>
            <td class="actions">
              <button
                @click="approvePlayer(guest)"
                :disabled="processingUserId === guest.userId"
                class="btn-success btn-sm"
              >
                {{ processingUserId === guest.userId ? 'Approving...' : 'Approve' }}
              </button>
              <button
                @click="rejectPlayer(guest)"
                :disabled="processingUserId === guest.userId"
                class="btn-danger btn-sm"
              >
                {{ processingUserId === guest.userId ? 'Rejecting...' : 'Reject' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Unassigned Players Table -->
    <div v-if="activeTab === 'unassigned'" class="table-container">
      <h2 class="section-title">Unassigned Players</h2>
      <p v-if="unassignedPlayers.length === 0" class="empty-message">
        No unassigned players
      </p>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>MC UUID</th>
            <th>Has Password</th>
            <th>Created</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in unassignedPlayers" :key="player.userId">
            <td><strong>{{ player.username }}</strong></td>
            <td class="text-mono">{{ player.mcUuid.substring(0, 8) }}...</td>
            <td>
              <span :class="['badge', player.hasPassword ? 'badge-success' : 'badge-warning']">
                {{ player.hasPassword ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>{{ formatDate(player.createdAt) }}</td>
            <td>{{ player.lastLogin ? formatDate(player.lastLogin) : 'Never' }}</td>
            <td>
              <button
                @click="assignPlayer(player)"
                :disabled="processingUserId === player.userId"
                class="btn-primary btn-sm"
              >
                {{ processingUserId === player.userId ? 'Adding...' : 'Add to Nation' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '@/stores/auth'
import {
  getUnassignedPlayers,
  assignPlayerToStructure,
  type PlayerOut,
} from '@/services/playersApi'
import {
  getStructureGuests,
  approveGuest,
  rejectGuest,
  type GuestOut,
} from '@/services/playersApi'

const auth = useAuth()
const activeTab = ref<'guests' | 'unassigned'>('guests')
const guests = ref<GuestOut[]>([])
const unassignedPlayers = ref<PlayerOut[]>([])
const loading = ref(true)
const error = ref('')
const successMessage = ref('')
const processingUserId = ref<number | null>(null)

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    // Load guests (pending requests)
    if (auth.structure_id) {
      const guestsResponse = await getStructureGuests(auth.structure_id)
      guests.value = guestsResponse.guests
    }

    // Load unassigned players
    const unassignedResponse = await getUnassignedPlayers()
    unassignedPlayers.value = unassignedResponse.players
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to load players'
  } finally {
    loading.value = false
  }
}

async function approvePlayer(guest: GuestOut) {
  if (processingUserId.value || !auth.structure_id) return

  if (!confirm(`Approve ${guest.username} as a member of your nation?`)) {
    return
  }

  processingUserId.value = guest.userId
  error.value = ''
  successMessage.value = ''

  try {
    const response = await approveGuest(auth.structure_id, guest.userId)
    successMessage.value = `${guest.username} has been approved as a ${response.roleAssigned}`

    // Remove from guests list
    guests.value = guests.value.filter((g) => g.userId !== guest.userId)

    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to approve player'
  } finally {
    processingUserId.value = null
  }
}

async function rejectPlayer(guest: GuestOut) {
  if (processingUserId.value || !auth.structure_id) return

  if (
    !confirm(
      `Reject ${guest.username}'s request to join? They will be removed from the structure.`,
    )
  ) {
    return
  }

  processingUserId.value = guest.userId
  error.value = ''
  successMessage.value = ''

  try {
    const response = await rejectGuest(auth.structure_id, guest.userId)
    successMessage.value = response.message

    // Remove from guests list
    guests.value = guests.value.filter((g) => g.userId !== guest.userId)

    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to reject player'
  } finally {
    processingUserId.value = null
  }
}

async function assignPlayer(player: PlayerOut) {
  if (processingUserId.value) return

  if (!confirm(`Add ${player.username} to your nation?`)) {
    return
  }

  processingUserId.value = player.userId
  error.value = ''
  successMessage.value = ''

  try {
    const response = await assignPlayerToStructure(player.userId)
    successMessage.value = `${player.username} has been added to ${response.structureName} as ${response.roleAssigned}`

    // Remove from unassigned list
    unassignedPlayers.value = unassignedPlayers.value.filter((p) => p.userId !== player.userId)

    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to add player'
  } finally {
    processingUserId.value = null
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.player-management {
  max-width: 1400px;
  margin: 0 auto;
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

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--bg-tertiary);
}

.tab {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.table-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.empty-message {
  text-align: center;
  padding: 3rem;
  opacity: 0.6;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: var(--bg-tertiary);
}

.data-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.data-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}

.data-table tbody tr:hover {
  background: var(--bg-tertiary);
}

.data-table td {
  padding: 1rem;
}

.text-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  opacity: 0.8;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-success {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.badge-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary,
.btn-success,
.btn-danger,
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

.btn-success {
  background: #22c55e;
  color: white;
}

.btn-success:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
