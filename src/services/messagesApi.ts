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
