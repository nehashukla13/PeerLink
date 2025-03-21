import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    hmr: {
      clientPort: 443,
      path: 'hmr-client',
    }
  }
})