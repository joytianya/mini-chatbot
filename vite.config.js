import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: 'client',  // 指定client目录为根目录
  plugins: [react()],
  base: '/mini-chatbot/',
  server: {
    host: '0.0.0.0',  // 允许局域网访问
    port: 5173,
    proxy: {
      // 添加代理配置，将/api开头的请求代理到后端服务器
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false
      }
    }
  },
  build: {
    outDir: '../dist'  // 输出到项目根目录的dist文件夹
  }
}) 