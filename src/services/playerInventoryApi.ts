import { api } from './api'

export type InventoryItem = {
  item_id: number
  name: string
  quantity: number
  price?: number | null
  value?: number | null
}

export type PlayerInventorySnapshot = {
  user_id: number
  structure_id: string
  items: InventoryItem[]
  total_value?: number | null
}

export type PlayerLedgerEntry = {
  id: number
  timestamp: string
  item_id: number
  item_name: string
  delta_qty: number
  trade_id?: number | null
  trade_line_id?: number | null
  movement_reason_code?: string | null
}

export type PlayerLedgerResponse = {
  total: number
  limit: number
  offset: number
  rows: PlayerLedgerEntry[]
}

/** Snapshot for ONE user. If you pass asOf (ISO datetime), BE returns price/value columns + total_value. */
export async function getPlayerInventory(
  userId: number,
  asOf?: string,
): Promise<PlayerInventorySnapshot> {
  const params = asOf ? { as_of: asOf } : undefined
  const { data } = await api.get(`/inventory/player/${userId}`, { params })
  return data
}

/** Ledger for ONE user (not filtered by item on BE). Use a bigger limit and filter by item on FE. */
export async function getPlayerLedger(
  userId: number,
  limit = 500,
  offset = 0,
): Promise<PlayerLedgerResponse> {
  const { data } = await api.get(`/inventory/player/${userId}/ledger`, {
    params: { limit, offset },
  })
  return data
}
