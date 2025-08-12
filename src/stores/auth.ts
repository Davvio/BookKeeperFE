import { defineStore } from 'pinia'
import { api, setAuth } from '@/services/api'
import type { Router } from 'vue-router'

type Permissions = Record<string, boolean>

type LoginResponse = {
  access_token: string
  token_type: 'bearer'
  role_codes: string[]
  permissions: Permissions
  structure_id: string
  user_id: number
  username: string
}

type AuthState = {
  token: string
  structure_id: string
  user_id: number | null
  username: string
  role_codes: string[]
  permissions: Permissions
  loading: boolean
}

const STORAGE_KEY = 'bk_auth_v1'

export const useAuth = defineStore('auth', {
  state: (): AuthState => ({
    token: '',
    structure_id: '',
    user_id: null,
    username: '',
    role_codes: [],
    permissions: {},
    loading: false,
  }),

  getters: {
    isLogged: (s) => !!s.token,
    primaryRole: (s) => (s.role_codes.length > 0 ? s.role_codes[0] : 'EMPLOYEE'),
    can: (s) => (perm: string) => !!s.permissions[perm],
    hasRole: (s) => (code: string) => s.role_codes.indexOf(code) !== -1,
  },

  actions: {
    init() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      try {
        const data = JSON.parse(raw)
        this.token = data.token
        this.structure_id = data.structure_id
        this.user_id = data.user_id
        this.username = data.username
        this.role_codes = data.role_codes || []
        this.permissions = data.permissions || {}
        setAuth(this.token)
      } catch {
        // ignore corrupted storage
      }
    },

    persist() {
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

    async login(username: string, password: string) {
      this.loading = true
      try {
        const { data } = await api.post<LoginResponse>('/auth/login', { username, password })
        this.token = data.access_token
        this.structure_id = data.structure_id
        this.user_id = data.user_id
        this.username = data.username
        this.role_codes = data.role_codes || []
        this.permissions = data.permissions || {}
        setAuth(this.token)
        this.persist()
      } finally {
        this.loading = false
      }
    },

    logout(router?: Router) {
      this.token = ''
      this.structure_id = ''
      this.user_id = null
      this.username = ''
      this.role_codes = []
      this.permissions = {}
      localStorage.removeItem(STORAGE_KEY)
      setAuth(null)
      if (router) router.push('/login')
    },
  },
})
