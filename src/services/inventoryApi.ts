// Adjust the import if your axios instance lives elsewhere
import { api } from '@/services/api'

export type InventoryItemRow = {
  item_id: number
  item_name: string
  qty: number
  unit_value: number
  total_value: number
}
export type InventorySummary = {
  as_of: string
  include_external: boolean
  rows: InventoryItemRow[]
  grand_total_value: number
}

export type ItemByLocationRow = {
  location_id: number
  location_name: string
  is_external: boolean
  external_kind: 'IMPORT' | 'EXPORT' | null
  qty: number
  value: number
}

export type LocationSummaryRow = {
  location_id: number
  location_name: string
  is_external: boolean
  external_kind: 'IMPORT' | 'EXPORT' | null
  total_qty: number
  total_value: number
}

export type LocationByItemRow = {
  item_id: number
  item_name: string
  qty: number
  value: number
}

export async function getInventorySummary(params: {
  as_of?: string
  include_external?: boolean
  show_zero?: boolean
}) {
  const { as_of, include_external = false, show_zero = false } = params || {}
  const { data } = await api.get<InventorySummary>('/inventory/summary', {
    params: { as_of, include_external, show_zero },
  })
  return data
}

export async function getItemByLocation(params: {
  itemId: number
  as_of?: string
  include_external?: boolean
}) {
  const { itemId, as_of, include_external = true } = params
  const { data } = await api.get<ItemByLocationRow[]>(`/inventory/items/${itemId}/by-location`, {
    params: { as_of, include_external },
  })
  return data
}

export async function getInventoryByLocation(params: {
  as_of?: string
  include_external?: boolean
}) {
  const { as_of, include_external = true } = params || {}
  const { data } = await api.get<LocationSummaryRow[]>('/inventory/by-location', {
    params: { as_of, include_external },
  })
  return data
}

export async function getLocationByItem(params: { locationId: number; as_of?: string }) {
  const { locationId, as_of } = params
  const { data } = await api.get<LocationByItemRow[]>(
    `/inventory/locations/${locationId}/by-item`,
    { params: { as_of } },
  )
  return data
}
