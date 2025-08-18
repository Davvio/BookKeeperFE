// src/services/movementReasonsApi.ts
import { api } from './api'

export interface MovementReason {
  structure_id: string
  code: string
  name: string
  is_active: boolean
}

export async function listMovementReasons(activeOnly = true): Promise<MovementReason[]> {
  const { data } = await api.get('/movement-reasons', { params: { active_only: activeOnly } })
  return data
}

// Create (code must be unique per structure)
export async function createMovementReason(payload: {
  code: string
  name: string
  is_active?: boolean
}) {
  const { data } = await api.post('/movement-reasons', payload)
  return data as MovementReason
}

// Update name/is_active (identify by code)
export async function updateMovementReason(
  code: string,
  patch: { name?: string; is_active?: boolean },
) {
  const { data } = await api.patch(`/movement-reasons/${encodeURIComponent(code)}`, patch)
  return data as MovementReason
}

export async function deleteMovementReason(code: string) {
  await api.delete(`/movement-reasons/${encodeURIComponent(code)}`)
}
