<template>
  <div class="guest-management">
    <div class="page-header">
      <h1>Pending Guest Requests</h1>
      <p class="subtitle">
        Review and approve players who have requested to join your structure.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading guest requests...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="loadGuests" class="btn-secondary">Retry</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="guests.length === 0" class="empty-state">
      <p>No pending guest requests.</p>
      <p class="text-muted">Players who use the /join command will appear here for approval.</p>
    </div>

    <!-- Guests Table -->
    <div v-else class="guests-table-container">
      <table class="guests-table">
        <thead>
          <tr>
            <th>Minecraft Name</th>
            <th>UUID</th>
            <th>Has Account</th>
            <th>Requested</th>
            <th>Last Seen</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="guest in guests" :key="guest.userId">
            <td>
              <strong>{{ guest.username }}</strong>
            </td>
            <td class="text-mono">{{ guest.mcUuid.substring(0, 8) }}...</td>
            <td>
              <span class="badge badge-warning">
                No
              </span>
            </td>
            <td>{{ formatDate(guest.createdAt) }}</td>
            <td>{{ guest.lastLogin ? formatDate(guest.lastLogin) : 'Never' }}</td>
            <td class="actions">
              <button
                @click="approve(guest)"
                :disabled="processingUserId === guest.userId"
                class="btn-success btn-sm"
              >
                {{ processingUserId === guest.userId && currentAction === 'approve' ? 'Approving...' : 'Approve' }}
              </button>
              <button
                @click="reject(guest)"
                :disabled="processingUserId === guest.userId"
                class="btn-danger btn-sm"
              >
                {{ processingUserId === guest.userId && currentAction === 'reject' ? 'Rejecting...' : 'Reject' }}
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
import { useAuth } from '@/stores/auth'
import { getStructureGuests, approveGuest, rejectGuest, type GuestOut } from '@/services/playersApi'

const authStore = useAuth()
const guests = ref<GuestOut[]>([])
const loading = ref(true)
const error = ref('')
const successMessage = ref('')
const processingUserId = ref<number | null>(null)
const currentAction = ref<'approve' | 'reject' | null>(null)

async function loadGuests() {
  if (!authStore.structure_id) {
    error.value = 'You must be in a structure to view guests'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await getStructureGuests(authStore.structure_id)
    guests.value = response.guests
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to load guest requests'
  } finally {
    loading.value = false
  }
}

async function approve(guest: GuestOut) {
  if (processingUserId.value || !authStore.structure_id) return

  if (!confirm(`Approve ${guest.username} as a member of your structure?`)) {
    return
  }

  processingUserId.value = guest.userId
  currentAction.value = 'approve'
  error.value = ''
  successMessage.value = ''

  try {
    const response = await approveGuest(authStore.structure_id, guest.userId)

    successMessage.value = `${guest.username} has been approved as a ${response.roleAssigned}`

    // Remove guest from list
    guests.value = guests.value.filter(g => g.userId !== guest.userId)

    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to approve guest'
  } finally {
    processingUserId.value = null
    currentAction.value = null
  }
}

async function reject(guest: GuestOut) {
  if (processingUserId.value || !authStore.structure_id) return

  if (!confirm(`Reject ${guest.username}'s request to join? They will be removed from the structure.`)) {
    return
  }

  processingUserId.value = guest.userId
  currentAction.value = 'reject'
  error.value = ''
  successMessage.value = ''

  try {
    const response = await rejectGuest(authStore.structure_id, guest.userId)

    successMessage.value = response.message

    // Remove guest from list
    guests.value = guests.value.filter(g => g.userId !== guest.userId)

    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to reject guest'
  } finally {
    processingUserId.value = null
    currentAction.value = null
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString()
}

onMounted(() => {
  loadGuests()
})
</script>

<style scoped>
.guest-management {
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

.guests-table-container {
  overflow-x: auto;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.guests-table {
  width: 100%;
  border-collapse: collapse;
}

.guests-table th,
.guests-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.guests-table th {
  background: #f9fafb;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  color: #6b7280;
}

.guests-table tbody tr:hover {
  background: #f9fafb;
}

.guests-table tbody tr:last-child td {
  border-bottom: none;
}

.text-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
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

.btn-success {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
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
