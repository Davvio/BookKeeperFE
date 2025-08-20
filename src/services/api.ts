// src/services/api.ts
import axios, { AxiosError, type AxiosInstance } from 'axios'
import { defineStore } from 'pinia'
import type { Router } from 'vue-router'

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://bookkeeperbe.onrender.com')

export const api: AxiosInstance = axios.create({
  baseURL,
  // withCredentials: true, // enable if you ever need cookies
})

export function initApiInterceptors(router: Router) {
  // Always attach latest token
  api.interceptors.request.use((config) => {
    const auth = useAuth()
    if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
    return config
  })

  // Global 401 handler
  api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const status = error.response?.status
      if (status === 401) {
        const auth = useAuth()
        // Prevent loops: if we’re already on /login, just clear state
        const onLogin = router.currentRoute.value.path.startsWith('/login')
        await auth.logout()
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        if (!onLogin) router.replace(`/login?redirect=${redirect}`)
      }
      return Promise.reject(error)
    },
  )
}

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

export async function fetchRBACGraph() {
  const { data } = await axios.get('/rbac/graph')
  return data
}
