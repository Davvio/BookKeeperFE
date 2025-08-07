// src/services/apis.ts
import axios, { type AxiosInstance } from 'axios'
import { defineStore } from 'pinia'

export const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000', // FastAPI port
  // If you ever need cookies: withCredentials: true,
})

export function setAuth(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

export const useAuth = defineStore('auth', {
  state: () => ({
    token: '' as string,
  }),

  actions: {
    async login(username: string, password: string) {
      const { data } = await api.post('/auth/login', { username, password })
      this.token = data.access_token

      api.defaults.headers.common.Authorization = `Bearer ${this.token}`
    },

    logout() {
      this.token = ''
      delete api.defaults.headers.common.Authorization
    },
  },
})
