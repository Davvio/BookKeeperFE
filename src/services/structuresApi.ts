// src/services/structuresApi.ts
import { api } from './api'

export interface JoinCode {
  id: number
  code: string
  structureId: string
  createdAt: string
  createdByUserId: number
  expiresAt: string | null
  maxUses: number | null
  usedCount: number
  isActive: boolean
}

export interface CreateJoinCodeRequest {
  expiresInDays?: number
  maxUses?: number
}

export interface JoinStructureRequest {
  code: string
}

export interface JoinStructureResponse {
  message: string
  structureId: string
  structureName: string
}

/**
 * Join a structure using an invite code.
 * @param code - The structure join code (e.g., "GPR-6ORQEY")
 */
export async function joinStructure(code: string): Promise<JoinStructureResponse> {
  const { data } = await api.post<JoinStructureResponse>('/api/structures/join', { code })
  return data
}

/**
 * Leave the current structure.
 */
export async function leaveStructure(): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/api/structures/leave')
  return data
}

/**
 * Create a new join code for a structure (admin only).
 * @param structureId - The structure ID (e.g., "GPR")
 * @param options - Optional expiry and usage limits
 */
export async function createJoinCode(
  structureId: string,
  options?: CreateJoinCodeRequest,
): Promise<JoinCode> {
  const { data } = await api.post<JoinCode>(`/api/structures/${structureId}/codes`, options || {})
  return data
}

/**
 * List all join codes for a structure (admin only).
 * @param structureId - The structure ID (e.g., "GPR")
 */
export async function listJoinCodes(structureId: string): Promise<JoinCode[]> {
  const { data } = await api.get<JoinCode[]>(`/api/structures/${structureId}/codes`)
  return data
}

/**
 * Revoke/delete a join code (admin only).
 * @param structureId - The structure ID
 * @param codeId - The code ID to revoke
 */
export async function revokeJoinCode(
  structureId: string,
  codeId: number,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/api/structures/${structureId}/codes/${codeId}`,
  )
  return data
}

/**
 * Kick a member from the structure (admin only).
 * @param structureId - The structure ID
 * @param userId - The user ID to kick
 */
export async function kickMember(
  structureId: string,
  userId: number,
): Promise<{ message: string }> {
  const { data} = await api.delete<{ message: string }>(
    `/api/structures/${structureId}/members/${userId}`,
  )
  return data
}

export interface PublicStructure {
  id: string
  displayName: string
  description: string | null
  memberCount: number
  canJoin: boolean
}

export interface PublicStructuresResponse {
  structures: PublicStructure[]
}

export interface DirectJoinResponse {
  success: boolean
  structureId: string
  structureName: string
  message: string
}

/**
 * Get all public structures (nations/factions) available to join.
 */
export async function getPublicStructures(): Promise<PublicStructuresResponse> {
  const { data } = await api.get<PublicStructuresResponse>('/api/structures/public')
  return data
}

/**
 * Request to join a structure directly (become a guest pending approval).
 * @param structureId - The structure ID to join
 */
export async function requestJoinStructure(structureId: string): Promise<DirectJoinResponse> {
  const { data } = await api.post<DirectJoinResponse>(`/api/structures/${structureId}/request-join`)
  return data
}
