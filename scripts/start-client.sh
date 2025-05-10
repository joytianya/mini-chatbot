#!/bin/bash

# 杀死之前运行的Vite进程
echo "Killing previous Vite processes..."
pkill -f "vite"
sleep 1

# 加载nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 进入 client 目录
cd client

# 安装依赖
echo "Installing dependencies..."
npm install --legacy-peer-deps

# 安装 Markdown 相关依赖
echo "Installing Markdown dependencies..."
npm install react-markdown remark-gfm rehype-raw --legacy-peer-deps

# 启动开发服务器
echo "Starting development server..."
npm run dev 