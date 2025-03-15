import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: 'client',  // 指定client目录为根目录
  plugins: [react()],
  base: '/mini-chatbot/',
  server: {
    host: '0.0.0.0',  // 允许局域网访问
    port: 5173
  },
  build: {
    outDir: '../dist'  // 输出到项目根目录的dist文件夹
  }
}) 