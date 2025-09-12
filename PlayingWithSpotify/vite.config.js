import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // 判斷是否在開發模式
  const isDev = command === 'serve'

  return {
    base: isDev ? '/' : '/SpotifyAPI/', // 👈 這裡切換
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      allowedHosts: [
        "49f0d2b98516.ngrok-free.app"
      ],
      host: true,
      port: 5173
    }
  }
})

