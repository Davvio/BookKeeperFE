// src/stores/auth.ts
import { defineStore } from 'pinia'
import { api, setAuth } from '@/services/api'

export type Permissions = Record<string, boolean>

const STORAGE_KEY = 'auth_v1'
const SKEW_MS = 5_000 // avoid edge-of-expiry races

function decodeJwtExpMs(token: string | null): number | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const json = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json?.exp === 'number' ? json.exp * 1000 : null
  } catch {
    return null
  }
}

export const useAuth = defineStore('auth', {
  state: () => ({
    token: '' as string,
    structure_id: '' as string,
    user_id: null as number | null,
    username: '' as string,
    role_codes: [] as string[],
    permissions: {} as Permissions,
    loading: false as boolean,
    _expiryTimer: null as number | null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    expiresAtMs: (s) => decodeJwtExpMs(s.token),
    isExpired(): boolean {
      const exp = this.expiresAtMs
      return exp !== null && Date.now() + SKEW_MS >= exp
    },
    isAdmin: (s) => s.role_codes?.includes('admin') || !!s.permissions?.['users.admin'],

    /** First role (fallback 'EMPLOYEE') for chips/labels */
    primaryRole: (s) => s.role_codes?.[0] || 'EMPLOYEE',

    /** Check a permission key, e.g. auth.can('users.admin') */
    can: (s) => (perm: string) => !!s.permissions?.[perm],

    /** Check a role code (case-insensitive), e.g. auth.hasRole('GUILDMASTER') */
    hasRole: (s) => (code: string) => {
      if (!code) return false
      const tgt = code.toUpperCase()
      return (s.role_codes || []).some((c) => String(c).toUpperCase() === tgt)
    },
  },
  actions: {
    /** Legacy alias so existing code can call auth.init() */
    init() {
      this.initFromStorage()
    },

    /** Restore from localStorage and start expiry watcher */
    initFromStorage() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      try {
        const saved = JSON.parse(raw)
        this.token = saved.token || ''
        this.structure_id = saved.structure_id || ''
        this.user_id = typeof saved.user_id === 'number' ? saved.user_id : null
        this.username = saved.username || ''
        this.role_codes = saved.role_codes || []
        this.permissions = saved.permissions || {}
        setAuth(this.token || null)
        this._scheduleExpiryWatcher()
      } catch {
        /* ignore */
      }
    },

    _persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: this.token,
          structure_id: this.structure_id,
          user_id: this.user_id,
          username: this.username,
          role_codes: this.role_codes,
          permissions: this.permissions,
        }),
      )
    },

    /** After a successful login, set token & user info */
    applyLogin(payload: {
      access_token: string
      structure_id: string
      user_id: number
      username: string
      role_codes?: string[]
      permissions?: Permissions
    }) {
      this.token = payload.access_token
      this.structure_id = payload.structure_id
      this.user_id = payload.user_id
      this.username = payload.username
      this.role_codes = payload.role_codes || []
      this.permissions = payload.permissions || {}
      setAuth(this.token)
      this._persist()
      this._scheduleExpiryWatcher()
    },

    /** Website login */
    async login(username: string, password: string) {
      this.loading = true
      try {
        const res = await api.post('/auth/login', { username, password })
        this.applyLogin({
          access_token: res.data.access_token,
          structure_id: res.data.structure_id,
          user_id: res.data.user_id,
          username: res.data.username,
          role_codes: res.data.role_codes || [],
          permissions: res.data.permissions || {},
        })
      } finally {
        this.loading = false
      }
    },

    /** Minecraft login variant (binds minecraft_username server-side) */
    async loginMc(username: string, password: string, minecraft_username?: string) {
      this.loading = true
      try {
        const res = await api.post('/auth/mc/login', { username, password, minecraft_username })
        this.applyLogin({
          access_token: res.data.access_token,
          structure_id: res.data.structure_id,
          user_id: res.data.user_id,
          username: res.data.username,
          role_codes: res.data.role_codes || [],
          permissions: res.data.permissions || {},
        })
      } finally {
        this.loading = false
      }
    },

    /** Token-only setter (if you ever hydrate from a token response directly) */
    setTokenOnly(token: string) {
      this.token = token
      setAuth(token)
      this._persist()
      this._scheduleExpiryWatcher()
    },

    /** Clear state and cancel timers */
    async logout() {
      this.token = ''
      this.structure_id = ''
      this.user_id = null
      this.username = ''
      this.role_codes = []
      this.permissions = {}
      localStorage.removeItem(STORAGE_KEY)
      setAuth(null)
      if (this._expiryTimer) {
        window.clearTimeout(this._expiryTimer)
        this._expiryTimer = null
      }
    },

    /** Set a timeout to auto-logout at (exp - skew) */
    _scheduleExpiryWatcher() {
      if (this._expiryTimer) {
        window.clearTimeout(this._expiryTimer)
        this._expiryTimer = null
      }
      const exp = this.expiresAtMs
      if (!exp) return
      const delay = Math.max(0, exp - Date.now() - SKEW_MS)
      this._expiryTimer = window.setTimeout(() => {
        // If token expired while tab idle, clear; router/API interceptors handle redirect UX.
        this.logout()
      }, delay) as unknown as number
    },
  },
})
