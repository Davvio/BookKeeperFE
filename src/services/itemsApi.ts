// src/services/itemsApi.ts
import { api } from './api'
export type Item = {
  id: number
  name: string
  code: string
  category: string
  stack_size: number
  is_active: boolean
}
export async function listItems(params?: { q?: string; category?: string; active?: boolean }) {
  const { data } = await api.get<Item[]>('/items', { params })
  return data
}
export async function createItem(body: {
  name: string
  category: string
  stack_size?: number
  is_active?: boolean
}) {
  const { data } = await api.post<Item>('/items', body)
  return data
}
export async function updateItem(
  id: number,
  body: Partial<{ name: string; category: string; stack_size: number; is_active: boolean }>,
) {
  const { data } = await api.patch<Item>(`/items/${id}`, body)
  return data
}
