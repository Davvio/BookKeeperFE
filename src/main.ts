// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import 'uno.css'
import './styles/theme.css'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '@/stores/auth'
import { initApiInterceptors } from '@/services/api' // ⬅️ add

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// init interceptors AFTER router+pinia exist (handles global 401 → logout+redirect)
initApiInterceptors(router)

// rehydrate auth once on app start (so guards & interceptors see the token)
useAuth().initFromStorage()

app.mount('#app')
