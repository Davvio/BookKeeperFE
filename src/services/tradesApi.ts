import { api } from './api'

export type Direction = 'GAINED' | 'GIVEN'

export interface TradeLineIn {
  item_id: number
  quantity: number
  direction: Direction
  from_location_id?: number
  from_user_id?: number
  to_location_id?: number
  to_user_id?: number
  movement_reason_code?: string
}

export interface TradeCreate {
  timestamp: string // ISO
  from_location_id?: number // header defaults (optional)
  to_location_id?: number // header defaults (optional)
  lines: TradeLineIn[]
}

export async function createTrade(payload: TradeCreate) {
  const { data } = await api.post('/trades', payload)
  return data
}

export type TradeLineOut = TradeLineIn & { id: number }

export type TradeOut = {
  id: number
  timestamp: string
  from_location_id: number | null
  to_location_id: number | null
  user_id: number
  username: string
  gained: TradeLineOut[]
  given: TradeLineOut[]
  profit: number | null
}

export async function deleteTradeLine(lineId: number): Promise<{
  deleted_line_id: number
  trade_id: number
  deleted_trade: boolean
}> {
  const { data } = await api.delete(`/trades/trade-lines/${lineId}`)
  return data
}

export async function listTrades(): Promise<TradeOut[]> {
  const { data } = await api.get<TradeOut[]>('/trades')
  return data
}
