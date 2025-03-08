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

1. 进入server目录：
```bash
cd server
```

2. 运行启动脚本：
```bash
./start-python-server.sh
```

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

- Base URL
- API Key
- 模型名称
- Embedding配置

## 🌐 部署指南

### 本地开发环境

1. 克隆仓库：
```bash
git clone [仓库地址]
```

2. 前端开发：
```bash
cd client
npm install
npm run dev
```

3. 后端开发：
```bash
cd server
./start-python-server.sh
```

### 生产环境部署

#### 前端部署（以 GitHub Pages 为例）

1. 修改 `vite.config.js` 中的 base 配置
2. 构建和部署：

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

3. 访问 GitHub 仓库设置，确认 Pages 服务已开启

#### 后端部署（以 Render 为例）

1. 在 Render 上创建新的 Web Service
2. 配置以下内容：
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`
3. 设置环境变量

## ❓ 常见问题

1. **Q: 如何更改服务器端口？**  
   A: 修改 `start-python-server.sh` 中的 `PORT` 环境变量

2. **Q: 支持哪些文档格式？**  
   A: 目前支持 PDF、Word (.docx)、TXT 格式

3. **Q: 如何配置不同的模型？**  
   A: 在设置界面配置相应的 API 地址和密钥

4. **Q: 文档处理失败怎么办？**  
   A: 检查文档格式是否支持，确保文档未加密且格式正确

5. **Q: `package.json` 和 `package-lock.json` 有什么区别？**  
   A: 两者都是 npm 包管理的重要文件，但用途不同：
   - `package.json`：
     - 项目的配置文件，记录项目的基本信息
     - 声明项目依赖的包的版本范围（如 `^1.2.3` 表示兼容 1.x.x）
     - 包含项目的脚本命令（如 `npm run dev`）
     - 可以手动修改
   - `package-lock.json`：
     - 记录确切的依赖版本和依赖树
     - 确保团队成员使用相同的依赖版本
     - 加快安装速度（精确的版本记录）
     - 自动生成，不应手动修改
   
   > 💡 **最佳实践：**
   > - 两个文件都要提交到版本控制系统
   > - 执行 `npm install` 时会根据 `package-lock.json` 安装精确版本
   > - 更新依赖时使用 `npm update` 而不是手动修改

## 📄 许可证

MIT License 