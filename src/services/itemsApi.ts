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
export async function createItem(payload: {
  name: string
  code: string
  category: string
  stack_size: number
  is_active?: boolean
}): Promise<Item> {
  const { data } = await api.post('/items', payload)
  return data
}

export async function updateItem(
  id: number,
  body: Partial<{ name: string; category: string; stack_size: number; is_active: boolean }>,
) {
  const { data } = await api.patch<Item>(`/items/${id}`, body)
  return data
}

const API_BASE = (api.defaults.baseURL ?? '').replace(/\/$/, '')
export const getItemIconUrl = (id: number, bust?: number | string) =>
  `${API_BASE}/items/${id}/icon${bust ? `?v=${bust}` : ''}`

// Upload an icon (multipart/form-data)
export async function uploadItemIcon(itemId: number, file: File): Promise<void> {
  const fd = new FormData()
  fd.append('file', file)
  await api.post(`/items/${itemId}/icon`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
