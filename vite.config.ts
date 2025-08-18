import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import presetWind3 from '@unocss/preset-wind3'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS({
      presets: [presetWind3()],
    }),
  ],
  server: {
    proxy: {
      '/mc': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
