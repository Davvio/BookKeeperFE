/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/messagesApi.ts
import { api } from './api'

export type MessageCreate = {
  text: string
  kind?: 'CHAT' | 'TITLE' | 'ACTIONBAR' | 'BOSSBAR'
  meta?: Record<string, unknown>
  to_user_ids?: number[]
  to_party_ids?: number[]
  deliver_after?: string
  expires_at?: string
  requires_ack?: boolean
  priority?: 'NORMAL' | 'HIGH'
}

export type MessageCreatedOut = { message_id: number; recipients: number }
export type MessageOutboxRow = {
  id: number
  text: string
  kind: string
  created_at: string
  deliver_after?: string
  expires_at?: string
  total: number
  queued: number
  failed: number
  acked: number
}

export async function sendMessage(payload: MessageCreate): Promise<MessageCreatedOut> {
  const { data } = await api.post('/messages/outbox', payload)
  return data
}

export async function listOutbox(limit = 50): Promise<MessageOutboxRow[]> {
  const { data } = await api.get('/messages/outbox', { params: { limit } })
  return data
}

export async function sendMessageToParty(
  partyId: number,
  payload: {
    text: string
    kind?: 'CHAT' | 'TITLE' | 'ACTIONBAR' | 'BOSSBAR'
    meta?: any
    deliver_after?: string
    expires_at?: string
    requires_ack?: boolean
    priority?: 'NORMAL' | 'HIGH'
  },
) {
  const { data } = await api.post(`/parties/${partyId}/messages`, payload)
  return data
}

export type MCMessage = {
  id: number
  text: string
  kind: string
  meta: Record<string, unknown>
  expires_at?: string | null
  priority: string
  created_at: string
  position: 'TOP' | 'LEFT' | 'RIGHT' | 'BOTTOM'
}

export async function getInbox(): Promise<MCMessage[]> {
  const { data } = await api.get('/mc/messages')
  return data
}

export async function ackMessages(deliveredIds: number[], failedIds: number[]) {
  return api.post('/mc/messages/ack', {
    delivered: deliveredIds && deliveredIds.length ? deliveredIds : undefined,
    failed: failedIds && failedIds.length ? failedIds : undefined,
  })
}

export type OutboxMessage = {
  id: number
  text: string
  kind: string
  created_at: string
  targets: string[]
  status?: string
}

export type OutboxCreate = {
  text: string
  kind: string
  to_user_ids?: number[]
  to_party_ids?: number[]
  // You can extend with deliver_after, expires_at, requires_ack, priority...
}

export async function getOutbox(limit = 50): Promise<OutboxMessage[]> {
  const { data } = await api.get('/messages/outbox', { params: { limit } })
  return data
}

export async function sendOutboxMessage(payload: OutboxCreate) {
  const { data } = await api.post('/messages/outbox', payload)
  return data
}

export type BroadcastIn = {
  text: string
  kind: 'CHAT' | 'TITLE' | 'ACTIONBAR' | 'BOSSBAR'
  meta?: Record<string, any> | null
  deliver_after?: string | null
  expires_at?: string | null
  requires_ack?: boolean
  priority?: 'LOW' | 'NORMAL' | 'HIGH'
}

export async function broadcastMessage(
  body: BroadcastIn,
): Promise<{ message_id: number; recipients: number }> {
  const { data } = await api.post('/messages/broadcast', body)
  return data
}
