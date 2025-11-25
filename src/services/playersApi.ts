// src/services/playersApi.ts
import { api } from './api'

export interface PlayerOut {
  userId: number
  mcUuid: string
  username: string
  hasPassword: boolean
  structureId: string | null
  membershipStatus: string
  createdAt: string
  lastLogin: string | null
}

export interface UnassignedPlayersResponse {
  players: PlayerOut[]
  count: number
}

export interface AssignPlayerRequest {
  roleId?: number
}

export interface AssignPlayerResponse {
  success: boolean
  userId: number
  structureId: string
  structureName: string
  membershipStatus: string
  roleAssigned: string
}

export interface GuestOut {
  userId: number
  mcUuid: string
  username: string
  createdAt: string
  lastLogin: string | null
}

export interface GuestsResponse {
  guests: GuestOut[]
  count: number
}

export interface ApproveGuestRequest {
  roleId?: number
}

export interface ApproveGuestResponse {
  success: boolean
  userId: number
  membershipStatus: string
  roleAssigned: string
}

export interface RejectGuestResponse {
  success: boolean
  userId: number
  message: string
}

/**
 * Get all unassigned players (admin only)
 */
export async function getUnassignedPlayers(): Promise<UnassignedPlayersResponse> {
  const response = await api.get<UnassignedPlayersResponse>(
    '/api/admin/unassigned-players'
  )
  return response.data
}

/**
 * Assign an unassigned player to the admin's structure
 */
export async function assignPlayerToStructure(
  userId: number,
  payload?: AssignPlayerRequest
): Promise<AssignPlayerResponse> {
  const response = await api.post<AssignPlayerResponse>(
    `/api/admin/assign-player/${userId}`,
    payload || {}
  )
  return response.data
}

/**
 * Get all guests (pending members) for a structure
 */
export async function getStructureGuests(structureId: string): Promise<GuestsResponse> {
  const response = await api.get<GuestsResponse>(
    `/api/structures/${structureId}/guests`
  )
  return response.data
}

/**
 * Approve a guest, making them a full member
 */
export async function approveGuest(
  structureId: string,
  userId: number,
  payload?: ApproveGuestRequest
): Promise<ApproveGuestResponse> {
  const response = await api.post<ApproveGuestResponse>(
    `/api/structures/${structureId}/approve-guest/${userId}`,
    payload || {}
  )
  return response.data
}

/**
 * Reject a guest, removing them from the structure
 */
export async function rejectGuest(
  structureId: string,
  userId: number
): Promise<RejectGuestResponse> {
  const response = await api.post<RejectGuestResponse>(
    `/api/structures/${structureId}/reject-guest/${userId}`
  )
  return response.data
}
