import { api } from './api'

export type LocationType = 'TOWN' | 'OUTPOST' | 'MINE' | 'PORT' | 'OTHER'

export type Location = {
  id: number
  structure_id: string
  name: string
  code: string | null
  type: LocationType
  description?: string | null
  x?: number | null
  y?: number | null
  z?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LocationCreate = {
  name: string
  code?: string | null
  type: LocationType
  description?: string | null
  x?: number | null
  y?: number | null
  z?: number | null
  is_active?: boolean
}

export async function listLocations(only_active = true): Promise<Location[]> {
  const { data } = await api.get<Location[]>('/locations', { params: { only_active } })
  return data
}

export async function createLocation(payload: LocationCreate): Promise<Location> {
  const { data } = await api.post<Location>('/locations', payload)
  return data
}

export async function deleteLocation(locationId: number): Promise<void> {
  await api.delete(`/locations/${locationId}`)
}
