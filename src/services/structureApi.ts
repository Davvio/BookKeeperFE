// src/services/structureApi.ts
import { api } from './api'
export type StructureSettings = {
  structure_id: string
  currency_item_id: number | null
  currency_item_name: string | null
}
export async function getSettings() {
  const { data } = await api.get<StructureSettings>('/structure-settings')
  return data
}
export async function setCurrency(currency_item_id: number) {
  const { data } = await api.put<StructureSettings>('/structure-settings/currency', {
    currency_item_id,
  })
  return data
}
