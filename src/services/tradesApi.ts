import { api } from './api'

export type Direction = 'GAINED' | 'GIVEN'

export type TradeLineIn = {
  item_id: number
  direction: Direction
  quantity: number
  from_location_id?: number | null
  to_location_id?: number | null
}

export type TradeCreate = {
  timestamp: string // ISO string
  from_location_id?: number | null
  to_location_id?: number | null
  lines: TradeLineIn[]
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

export async function createTrade(payload: TradeCreate): Promise<TradeOut> {
  const { data } = await api.post<TradeOut>('/trades', payload)
  return data
}

export async function listTrades(): Promise<TradeOut[]> {
  const { data } = await api.get<TradeOut[]>('/trades')
  return data
}
