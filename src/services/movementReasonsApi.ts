// src/services/movementReasonsApi.ts
import { api } from './api'

export async function deleteMovementReason(code: string) {
  await api.delete(`/movement-reasons/${encodeURIComponent(code)}`)
}

export type MovementReason = {
  structure_id: string
  code: string
  name: string
  is_active: boolean
}

export type MovementReasonIn = {
  code: string
  name: string
  is_active: boolean
}

export async function listMovementReasons(only_active = true): Promise<MovementReason[]> {
  const { data } = await api.get<MovementReason[]>('/movement-reasons/', {
    params: { active_only: only_active },
  })
  return data
}

export async function createMovementReason(body: MovementReasonIn): Promise<MovementReason> {
  const { data } = await api.post<MovementReason>('/movement-reasons/', body)
  return data
}

export async function updateMovementReason(
  currentCode: string,
  body: MovementReasonIn,
): Promise<MovementReason> {
  // currentCode = the existing code in the DB (path param)
  // body.code can be same or a new code if you are renaming it
  const { data } = await api.patch<MovementReason>(
    `/movement-reasons/${encodeURIComponent(currentCode)}`,
    body,
  )
  return data
}
