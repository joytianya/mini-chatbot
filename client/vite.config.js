import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/mini-chatbot/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            // 将 /api 请求代理到后端服务器
            '^/mini-chatbot/api/.*': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/mini-chatbot/, ''),
            },
            // 保留原始代理配置，兼容性考虑
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});