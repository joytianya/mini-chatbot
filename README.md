# Mini-Chatbot 🤖

一个基于大语言模型的智能聊天机器人，支持文档对话功能。

🔗 [在线演示](https://joytianya.github.io/mini-chatbot/) 👈 点击体验

## 📑 目录

- [功能特点](#-功能特点)
- [系统架构](#-系统架构)
- [快速开始](#-快速开始)
  - [前端部署](#前端部署)
  - [后端部署](#后端部署)
- [使用指南](#-使用指南)
  - [基础对话](#基础对话)
  - [文档对话](#文档对话)
  - [深度研究](#深度研究)
- [配置说明](#-配置说明)
- [常见问题](#-常见问题)
- [许可证](#-许可证)

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

> 🔄 **开发与部署命令的区别：**
> 1. `npm run dev`（开发环境）：
>    - 启动本地开发服务器
>    - 支持热更新（修改代码后自动刷新）
>    - 不会进行代码压缩和优化
>    - 包含开发工具和调试信息
>    - 运行在内存中，不生成实际文件
>    - 适用于本地开发和调试
>
> 2. `npm run deploy`（生产环境）：
>    - 先执行 `npm run build` 生成静态文件
>    - 对代码进行压缩和优化
>    - 移除调试信息和开发工具
>    - 生成实际的静态文件（在 dist 目录）
>    - 将文件部署到 GitHub Pages
>    - 适用于生产环境发布
>
> 💡 **使用场景：**
> - 开发时使用 `npm run dev`
> - 正式发布时使用 `npm run deploy`

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

> 💡 **环境说明：**
> - `npm run build` 会自动设置 `NODE_ENV=production`
> - `npm run deploy` 本身不会设置 NODE_ENV，它主要做两件事：
>   1. 执行 `predeploy`（即 `npm run build`）
>   2. 将 `dist` 目录推送到 gh-pages 分支
> - 如果需要确保生产环境配置，可以显式设置：
>   ```bash
>   # Windows
>   set NODE_ENV=production && npm run deploy
>   
>   # Linux/Mac
>   NODE_ENV=production npm run deploy
>   ```

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

#### 本地开发环境

1. 进入server目录：
```bash
cd server
```

2. 创建并激活 Python 虚拟环境：
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 启动开发服务器：
```bash
python app.py
```

> 💡 **本地开发说明：**
> - 默认运行在 `development` 环境
> - 支持热重载（修改代码后自动重启）
> - 显示详细的调试信息
> - 访问地址：`http://localhost:5001`

#### 生产环境部署（以 Render 为例）

1. 在 Render 上创建新的 Web Service
2. 配置以下内容：
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`
3. 设置环境变量：
   - `FLASK_ENV`: `production`  # 生产环境必须设置为 production
   - `PORT`: `10000`  # Render 会自动分配端口，这个值会被覆盖
   - 其他必要的环境变量（如有）

> 🔒 **生产环境说明：**
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
2. 在设置中配置模型API信息（或使用深度研究模式）
3. 开始与AI助手对话

### 文档对话

1. 上传文档（支持PDF、Word、TXT格式）
2. 等待文档处理完成
3. 开始针对文档内容进行提问

### 深度研究

深度研究模式是一个强大的功能，专门用于：

- 🔬 复杂问题分析
- 📊 多角度思考
- 🎯 深入探讨细节
- 🧩 系统性解决方案

使用方法：
1. 点击输入框上方的"深度研究"按钮激活
2. 按钮高亮表示深度研究模式已开启（此模式下无需配置模型API）
3. 此时AI将：
   - 自动使用高级模型进行分析
   - 提供更详细的推理过程
   - 给出更全面的答案
   - 考虑更多相关因素

> 💡 **提示：** 
> - 深度研究模式无需配置API，可以直接使用
> - 特别适合以下场景：
>   - 技术难题攻关
>   - 方案设计讨论
>   - 原理深入解析
>   - 多维度分析问题

## ⚙️ 配置说明

### 环境变量

- `PORT`：服务器端口（默认5001）
- `FLASK_ENV`：运行环境（development/production）

> 💡 **Node.js 环境变量说明：**
> - `process.env` 是 Node.js 中访问环境变量的对象
> - 常见的环境变量：
>   - `process.env.NODE_ENV`：运行环境（development/production）
>   - `process.env.PORT`：服务器端口
>   - `process.env.BASE_URL`：基础URL
> - 设置方式：
>   1. 命令行直接设置：`NODE_ENV=production npm start`
>   2. .env 文件：`NODE_ENV=production`
>   3. package.json 脚本：`"build": "NODE_ENV=production vite build"`
> - 注意：
>   - 开发环境可以通过 `.env.development` 设置
>   - 生产环境可以通过 `.env.production` 设置
>   - 环境变量在构建时会被固定，不能在运行时修改

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

## 📜 许可证

MIT License

Copyright (c) 2024 Mini-Chatbot

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.