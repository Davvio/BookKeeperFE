// src/stores/auth.ts
import { defineStore } from 'pinia'
import { api, setAuth } from '@/services/api'

type JwtPayload = {
  exp: number
  sub: string
  username?: string
  role?: string
  structure_id?: string | number
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const useAuth = defineStore('auth', {
  state: () => ({
    token: '' as string,
    user: null as null | {
      id: number
      username: string
      role: string
      structureId?: string | number
    },
  }),
  getters: {
    isLogged: (s) => {
      if (!s.token) return false
      const p = parseJwt(s.token)
      return !!(p?.exp && Date.now() < p.exp * 1000)
    },
    role: (s) => s.user?.role || 'EMPLOYEE',
    structureId: (s) => s.user?.structureId,
  },
  actions: {
    init() {
      const tk = localStorage.getItem('bk_token') || ''
      if (!tk) return
      this.token = tk
      setAuth(tk)
      const p = parseJwt(tk)
      if (p && p.exp && Date.now() < p.exp * 1000) {
        this.user = {
          id: Number(p.sub),
          username: p.username || '',
          role: p.role || 'EMPLOYEE',
          structureId: p.structure_id,
        }
      } else {
        this.logout()
      }
    },
    async login(username: string, password: string) {
      const res = await api.post('/auth/login', { username, password })
      const tk = res.data.access_token
      this.token = tk
      localStorage.setItem('bk_token', tk)
      setAuth(tk)

      const p = parseJwt(tk)
      this.user = p
        ? {
            id: Number(p.sub),
            username: p.username || username,
            role: p.role || 'EMPLOYEE',
            structureId: p.structure_id,
          }
        : { id: 0, username, role: 'EMPLOYEE' }
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('bk_token')
      setAuth(null)
    },
  },
})
