# Mini-Chatbot 🤖

一个基于大语言模型的智能聊天机器人，支持文档对话功能。

## 📑 目录

- [功能特点](#-功能特点)
- [系统架构](#-系统架构)
- [快速开始](#-快速开始)
  - [前端部署](#前端部署)
  - [后端部署](#后端部署)
- [使用指南](#-使用指南)
  - [基础对话](#基础对话)
  - [文档对话](#文档对话)
- [配置说明](#-配置说明)
- [部署指南](#-部署指南)
  - [本地开发环境](#本地开发环境)
  - [生产环境部署](#生产环境部署)
- [常见问题](#-常见问题)

## 🌟 功能特点

- 💬 支持多种大语言模型（如 GPT-3.5、GPT-4、DeepSeek等）
- 📚 支持文档对话功能
- 🔄 流式响应，实时输出
- 📝 支持多种文档格式（PDF、Word、TXT等）
- 🎨 美观的用户界面
- 🔒 安全的API密钥管理

## 🔧 系统架构

- 前端：React + Vite + TypeScript
- 后端：Python Flask
- 文档处理：LangChain + FAISS
- 界面设计：Tailwind CSS

## 🚀 快速开始

### 前端部署

1. 进入client目录：
```bash
cd client
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

#### 前端部署（以 GitHub Pages 为例）

0. 安装 gh-pages 包：
```bash
npm install gh-pages --save-dev
```

1. 配置 package.json：
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://[你的GitHub用户名].github.io/[仓库名]"
}
```

2. 修改 `vite.config.js` 中的 base 配置：
```javascript
export default defineConfig({
  base: '/[仓库名]/',  // 替换为你的仓库名
  // ... 其他配置
})
```

3. 构建和部署：
```bash
# 构建项目 - 将源代码编译打包成静态文件
npm run build  # 这会在 dist 目录下生成生产环境的静态文件

# 部署项目 - 将构建好的静态文件部署到 GitHub Pages
npm run deploy  # 这会将 dist 目录下的文件推送到 gh-pages 分支
```

> 💡 **说明：**
> - `npm run build`：仅构建项目，生成静态文件
> - `npm run deploy`：包含构建步骤，并自动部署到 GitHub Pages
> - 如果只想本地查看构建结果，使用 `build`
> - 如果要发布到线上环境，使用 `deploy`

4. 配置 GitHub Pages：
   - 进入仓库的 Settings > Pages
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "gh-pages" 分支，文件夹选择 "/(root)"
   - 点击 Save，等待部署完成
   - 部署完成后，可以通过 `https://[你的GitHub用户名].github.io/[仓库名]` 访问

> 🔔 **注意：**
> - 确保仓库是公开的（public）
> - 首次部署可能需要等待几分钟
> - 如果部署后页面404，检查 `base` 配置是否正确

### 后端部署

#### 后端部署（以 Render 为例）

1. 在 Render 上创建新的 Web Service
2. 配置以下内容：
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`
3. 设置环境变量：
   - `FLASK_ENV`: `production`  # 生产环境必须设置为 production
   - `PORT`: `10000`  # Render 会自动分配端口，这个值会被覆盖
   - 其他必要的环境变量（如有）

> �� **生产环境说明：**
> - 生产环境下 `FLASK_ENV=production` 会：
>   - 强制禁用调试模式（即使 `app.run(debug=True)`）
>   - 强制禁用热重载（即使 `use_reloader=True`）
>   - 简化错误信息，不暴露敏感信息
>   - 优化性能，禁用开发特性
> - 这是 Flask 的安全特性，不可覆盖
> - 如果需要调试，建议在本地开发环境进行

## 📖 使用指南

### 基础对话

1. 访问应用界面
2. 在设置中配置模型API信息
3. 开始与AI助手对话

### 文档对话

1. 上传文档（支持PDF、Word、TXT格式）
2. 等待文档处理完成
3. 开始针对文档内容进行提问

## ⚙️ 配置说明

### 环境变量

- `PORT`：服务器端口（默认5001）
- `FLASK_ENV`：运行环境（development/production）

### 模型配置

#### 对话模型配置
- `base_url`：模型API的基础URL
- `api_key`：访问模型API的密钥
- `model_name`：使用的模型名称（如 'gpt-3.5-turbo'）

#### Embedding配置
- `embedding_base_url`：Embedding服务的基础URL
- `embedding_api_key`：访问Embedding服务的密钥
- `embedding_model_name`：使用的Embedding模型名称

> 💡 **配置说明：**
> - 对话模型用于处理用户的问题和生成回答
> - Embedding模型用于处理文档并建立向量索引
> - 两组配置可以使用相同或不同的服务提供商

## 🌐 部署指南

### 本地开发环境

1. 克隆仓库：
```bash
git clone https://github.com/joytianya/mini-chatbot.git
```

2. 前端开发：
```bash
cd client
npm install
npm run dev
```

### 生产环境部署

1. 在 Render 上创建新的 Web Service
2. 配置以下内容：
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`
3. 设置环境变量：
   - `FLASK_ENV`: `production`  # 生产环境必须设置为 production
   - `PORT`: `10000`  # Render 会自动分配端口，这个值会被覆盖
   - 其他必要的环境变量（如有）

> 💡 **注意：**
> - 生产环境必须使用 `FLASK_ENV=production`，这会禁用调试模式
> - 生产环境下不会启用热重载
> - 错误信息会被简化，不会暴露敏感信息
> - 性能会得到优化

## 🤔 常见问题

1. 如何解决部署后页面404的问题？
   - 检查 `base` 配置是否正确
   - 确保仓库是公开的（public）
   - 首次部署可能需要等待几分钟

2. 如何解决后端部署的问题？
   - 确保 Render 环境配置正确
   - 检查环境变量设置是否正确
   - 如果问题仍然存在，可以尝试手动部署

3. 如何解决前端部署的问题？
   - 检查 npm 命令是否正确
   - 确保所有依赖安装正确
   - 如果问题仍然存在，可以尝试手动部署

4. 如何解决文档对话的问题？
   - 确保文档格式正确
   - 确保文档内容清晰可读
   - 如果问题仍然存在，可以尝试手动处理文档