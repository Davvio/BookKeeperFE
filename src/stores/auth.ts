import { defineStore } from 'pinia'
import { api, setAuth } from '@/services/api'

export const useAuth = defineStore('auth', {
  state: () => ({ token: '' }),
  getters: { isLogged: (s) => !!s.token },
  actions: {
    async login(username: string, password: string) {
      const { data } = await api.post('/auth/login', { username, password })
      this.token = data.access_token
      setAuth(this.token)
    },
    logout() {
      this.token = ''
      setAuth(null)
    },
    init() {
      if (this.token) {
        setAuth(this.token)
      }
    },
  },
})
