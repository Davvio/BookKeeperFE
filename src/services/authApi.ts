// src/services/authApi.ts
import { api } from './api'
import type { Permissions } from '@/stores/auth'

export interface UserInfo {
  userId: number
  mcUuid: string
  username: string  // Minecraft username, used for login
  hasPassword: boolean
  structureId: string | null
  membershipStatus: string
  roles: string[]
}

export interface MagicLoginResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

export interface SetPasswordRequest {
  password: string
}

export interface SetPasswordResponse {
  success: boolean
  username: string
}

export interface MagicLinkRequest {
  mcUuid: string
  mcName: string
}

export interface MagicLinkResponse {
  token: string
  magicUrl: string
  expiresAt: string
  isNewUser: boolean
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

/**
 * Regular username/password login.
 * @param username - The user's Minecraft username
 * @param password - The user's password
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/login', { username, password })
  return data
}

/**
 * Exchange a magic login token for a JWT access token.
 * @param token - The magic token from the URL
 */
export async function magicLogin(token: string): Promise<MagicLoginResponse> {
  const { data } = await api.post<MagicLoginResponse>('/api/auth/magic-login', { token })
  return data
}

/**
 * Set a password for the current authenticated user.
 * Requires a valid JWT token.
 * Username is already set from Minecraft, this only sets the password.
 * @param password - The new password to set
 */
export async function setPassword(password: string): Promise<SetPasswordResponse> {
  const { data } = await api.post<SetPasswordResponse>('/api/auth/set-password', { password })
  return data
}

/**
 * Request a magic login link for a Minecraft user.
 * This is primarily for testing - normally called by the Minecraft mod.
 * @param mcUuid - Minecraft UUID
 * @param mcName - Minecraft username
 */
export async function requestMagicLink(
  mcUuid: string,
  mcName: string,
): Promise<MagicLinkResponse> {
  const { data } = await api.post<MagicLinkResponse>('/api/mc/magic-link', { mcUuid, mcName })
  return data
}
