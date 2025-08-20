// src/services/partiesApi.ts
import { api } from './api'

export type PartyList = { id: number; name: string; members_count: number }[]
export type Party = {
  id: number
  structure_id: string
  name: string
  description?: string | null
  created_by_user_id: number
  leader_user_id?: number | null
}

export async function setPartyLeader(id: number, leader_user_id: number | null): Promise<Party> {
  const { data } = await api.put(`/parties/${id}/leader`, { leader_user_id })
  return data
}

export async function listParties(): Promise<PartyList> {
  const { data } = await api.get('/parties')
  return data
}

export async function createParty(payload: {
  name: string
  description?: string | null
}): Promise<Party> {
  const { data } = await api.post('/parties', payload)
  return data
}

export async function getParty(id: number): Promise<Party> {
  const { data } = await api.get(`/parties/${id}`)
  return data
}

export async function updateParty(
  id: number,
  payload: { name: string; description?: string | null },
): Promise<Party> {
  const { data } = await api.put(`/parties/${id}`, payload)
  return data
}

export async function deleteParty(id: number): Promise<void> {
  await api.delete(`/parties/${id}`)
}

export async function getPartyMembers(id: number): Promise<number[]> {
  const { data } = await api.get(`/parties/${id}/members`)
  return data
}

export async function setPartyMembers(id: number, user_ids: number[]): Promise<number[]> {
  const { data } = await api.put(`/parties/${id}/members`, { user_ids })
  return data
}
