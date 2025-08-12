import { api } from './api'

export type LocationType = 'TOWN' | 'OUTPOST' | 'MINE' | 'PORT' | 'OTHER'

export type Location = {
  id: number
  structure_id: string
  name: string
  code: string
  type: LocationType
  description?: string | null
  x?: number | null
  y?: number | null
  z?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function listLocations(only_active = true): Promise<Location[]> {
  const { data } = await api.get<Location[]>('/locations', { params: { only_active } })
  return data
}
