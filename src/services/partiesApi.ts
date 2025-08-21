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

export async function listParties(): Promise<PartyList> {
  const { data } = await api.get('/parties')
  return data
}

export type PartyMemberView = {
  user_id: number
  username: string
  minecraft_username?: string | null
  is_leader: boolean
}

export type PartyMeOut = {
  id: number
  name: string
  description?: string | null
  leader_user_id?: number | null
  leader_username?: string | null
  leader_minecraft_username?: string | null
  members: PartyMemberView[]
}

export async function listMyParties(): Promise<PartyMeOut[]> {
  const { data } = await api.get('/parties/me')
  return data
}

export async function createParty(payload: { name: string; description?: string | null }) {
  const { data } = await api.post('/parties', payload)
  return data
}
export async function updateParty(
  id: number,
  payload: { name: string; description?: string | null },
) {
  const { data } = await api.put(`/parties/${id}`, payload)
  return data
}
export async function setPartyLeader(id: number, leader_user_id: number | null) {
  const { data } = await api.put(`/parties/${id}/leader`, { leader_user_id })
  return data
}
export async function setPartyMembers(id: number, user_ids: number[]) {
  const { data } = await api.put(`/parties/${id}/members`, { user_ids })
  return data
}

export type PartyListRow = { id: number; name: string; members_count: number }

export async function listAllParties(): Promise<PartyListRow[]> {
  const { data } = await api.get('/parties') // admin-only list
  return data
}

export async function getParty(partyId: number) {
  const { data } = await api.get(`/parties/${partyId}`)
  return data
}
export async function getPartyMembers(partyId: number): Promise<number[]> {
  const { data } = await api.get(`/parties/${partyId}/members`)
  return data
}
export async function deleteParty(partyId: number) {
  await api.delete(`/parties/${partyId}`)
}
