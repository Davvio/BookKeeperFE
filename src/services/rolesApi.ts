import { api } from './api'

export type Role = {
  id: number
  structure_id: string
  name: string
  code: string
  permissions: Record<string, boolean>
  is_system: boolean
  created_at: string
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await api.get<Role[]>('/roles')
  return data
}
