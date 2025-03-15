import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mini-chatbot/',
  server: {
    host: '0.0.0.0',  // 允许局域网访问
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
}) 