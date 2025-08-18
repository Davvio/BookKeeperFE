import { api } from './api'

export type UserOut = {
  id: number
  username: string
  structure_id: string
  role_ids: number[]
  role_codes: string[]
  role_names: string[]
}

export type UserCreate = {
  username: string
  password: string
  role_ids: number[]
}

export type UserUpdateRoles = {
  role_ids: number[]
}

export async function listUsersOld(): Promise<UserOut[]> {
  const { data } = await api.get<UserOut[]>('/users')
  return data
}

export async function createUser(body: UserCreate): Promise<UserOut> {
  const { data } = await api.post<UserOut>('/users', body)
  return data
}

export async function replaceUserRoles(userId: number, roles: number[]): Promise<UserOut> {
  const { data } = await api.patch<UserOut>(`/users/${userId}/roles`, {
    role_ids: roles,
  } as UserUpdateRoles)
  return data
}

export interface UserLite {
  id: number
  username: string
  structure_id: string
}

export async function listUsersLite(): Promise<UserLite[]> {
  const { data } = await api.get('/users')
  return data as UserLite[]
}

// src/services/usersApi.ts (ensure this exists)
export async function listUsers() {
  const res = await api.get('/users')
  return res.data
}
