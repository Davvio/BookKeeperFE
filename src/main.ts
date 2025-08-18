import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import 'uno.css'
import { useAuth } from '@/stores/auth'
import './styles/theme.css'
import 'leaflet/dist/leaflet.css' // <-- add this line

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
useAuth().init()
