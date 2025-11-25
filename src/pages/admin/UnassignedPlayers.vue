<template>
  <div class="unassigned-players">
    <div class="page-header">
      <h1>Unassigned Players</h1>
      <p class="subtitle">
        Players who have joined but are not part of any structure.
        Assign them to your structure to give them access.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading players...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="loadPlayers" class="btn-secondary">Retry</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="players.length === 0" class="empty-state">
      <p>No unassigned players found.</p>
      <p class="text-muted">New players will appear here when they join Minecraft.</p>
    </div>

    <!-- Players Table -->
    <div v-else class="players-table-container">
      <table class="players-table">
        <thead>
          <tr>
            <th>Minecraft Name</th>
            <th>UUID</th>
            <th>Has Password</th>
            <th>Joined</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in players" :key="player.userId">
            <td>
              <strong>{{ player.username }}</strong>
            </td>
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
                :disabled="assigningUserId === player.userId"
                class="btn-primary btn-sm"
              >
                {{ assigningUserId === player.userId ? 'Assigning...' : 'Assign to My Structure' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUnassignedPlayers, assignPlayerToStructure, type PlayerOut } from '@/services/playersApi'

const players = ref<PlayerOut[]>([])
const loading = ref(true)
const error = ref('')
const successMessage = ref('')
const assigningUserId = ref<number | null>(null)

async function loadPlayers() {
  loading.value = true
  error.value = ''

  try {
    const response = await getUnassignedPlayers()
    players.value = response.players
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to load unassigned players'
  } finally {
    loading.value = false
  }
}

async function assignPlayer(player: PlayerOut) {
  if (assigningUserId.value) return

  if (!confirm(`Assign ${player.username} to your structure?`)) {
    return
  }

  assigningUserId.value = player.userId
  error.value = ''
  successMessage.value = ''

  try {
    const response = await assignPlayerToStructure(player.userId)

    successMessage.value = `${player.username} has been assigned to ${response.structureName} as ${response.roleAssigned}`

    // Remove player from list
    players.value = players.value.filter(p => p.userId !== player.userId)

    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to assign player'
  } finally {
    assigningUserId.value = null
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString()
}

onMounted(() => {
  loadPlayers()
})
</script>

<style scoped>
.unassigned-players {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.subtitle {
  color: #6b7280;
  margin: 0;
}

.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #991b1b;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.success-message {
  background: #d1fae5;
  border: 1px solid #10b981;
  color: #065f46;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.empty-state p {
  margin: 0.5rem 0;
}

.text-muted {
  color: #6b7280;
  font-size: 0.875rem;
}

.players-table-container {
  overflow-x: auto;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.players-table {
  width: 100%;
  border-collapse: collapse;
}

.players-table th,
.players-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.players-table th {
  background: #f9fafb;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  color: #6b7280;
}

.players-table tbody tr:hover {
  background: #f9fafb;
}

.players-table tbody tr:last-child td {
  border-bottom: none;
}

.text-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-secondary {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #4b5563;
}
</style>
