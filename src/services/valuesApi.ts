// src/services/valuesApi.ts
import { api } from './api'
export type ItemValue = {
  id: number
  structure_id: string
  item_id: number
  value_in_currency: string
  effective_from: string
}
export async function listValues(item_id?: number) {
  const { data } = await api.get<ItemValue[]>('/item-values', { params: { item_id } })
  return data
}
export async function createValue(body: {
  item_id: number
  value_in_currency: string | number
  effective_from?: string
}) {
  const { data } = await api.post<ItemValue>('/item-values', body)
  return data
}
