#!/bin/bash

# 进入 client 目录
cd client

# 安装依赖
echo "Installing dependencies..."
npm install

# 安装 Markdown 相关依赖
echo "Installing Markdown dependencies..."
npm install react-markdown remark-gfm rehype-raw

# 启动开发服务器
echo "Starting development server..."
npm run dev 