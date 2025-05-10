# Mini-Chatbot

一个简单的聊天机器人应用，支持直接API请求和通过后端代理的请求。

## 功能特点

- 支持多种LLM模型 (基于OpenRouter API)
- 支持流式响应
- 支持直接API请求和后端代理请求
- 简洁的用户界面
- 完整的测试工具

## 快速开始

### 1. 环境要求

- Node.js (14.x 或更高)
- Python 3.8+ 
- npm 或 yarn

### 2. 运行应用

使用管理脚本启动服务：

```bash
# 启动所有服务（前端+后端）
./manage.sh start

# 仅启动后端
./manage.sh start-backend

# 仅启动前端
./manage.sh start-frontend

# 重启所有服务
./manage.sh restart
```

启动后，可访问：
- 前端: http://localhost:5173
- 后端: http://localhost:5001

### 3. 配置

在项目根目录创建 `.env` 文件，配置必要的API密钥和URL。你可以复制 `.env.example` 文件并进行修改：

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑配置文件，填入你的API密钥
nano .env  # 或使用你喜欢的文本编辑器
```

配置文件中必需的设置：

```
OPENROUTER_API_KEY=your_api_key_here     # 在OpenRouter.ai获取API密钥
OPENROUTER_BASE_URL=https://openrouter.ai/api  # 注意：不要在末尾添加 /v1
OPENROUTER_MODEL_NAME=qwen/qwen3-1.7b    # 或其他你想使用的模型名称
```

如果你遇到API连接问题（如404错误），请检查`OPENROUTER_BASE_URL`是否正确。OpenRouter的API结构可能会变更，最新的URL格式应该是`https://openrouter.ai/api`（不带v1）。

## 测试

项目包含多种测试工具和脚本，用于验证功能和检查系统运行状态：

```bash
# 运行所有测试
./manage.sh test

# 运行特定测试
./manage.sh test openrouter
./manage.sh test backend
./manage.sh test update-logs

# 收集项目中的测试文件
./manage.sh test collect-tests
```

收集测试功能会扫描整个项目，将所有与测试相关的文件（如test_*.py、*_test.js等）复制到tests目录下的相应子目录中（python/、js/、scripts/），并生成一份测试文件汇总文档。这有助于集中管理所有测试文件，提高测试效率。

详细的测试说明请参阅 [测试目录README](./tests/README.md)。

## 故障排除

### 问题: 无法连接到后端服务器

1. 检查后端是否运行：`./manage.sh status`
2. 检查日志：`./manage.sh logs backend`
3. 尝试重启：`./manage.sh restart`

### 问题: API请求返回错误

1. 验证API密钥是否正确设置
2. 检查环境变量是否正确加载
3. 使用测试工具检查具体错误信息

### 问题: OpenRouter API返回404错误

这通常表示API端点路径有问题。请检查：

1. 确认`.env`文件中的`OPENROUTER_BASE_URL`设置为`https://openrouter.ai/api`（不要在末尾添加`/v1`）
2. 运行测试工具验证连接：`python tests/python/fix_openrouter_test.py`
3. 如果错误仍然存在，请查看OpenRouter官方文档，确认最新的API端点

错误日志示例：
```
2025-05-10 18:15:51,978 - openrouter_test - ERROR - Request failed: 404 Client Error: Not Found for url: https://openrouter.ai/api/v1/chat/completions
```

### 问题: 前端请求收到404/403错误

1. 确保使用正确的API路径
2. 检查Vite配置中的代理设置
3. 直接尝试使用后端URL（如`http://localhost:5001/api/test`）

### 查看日志

```bash
# 查看后端日志
./manage.sh logs backend

# 查看前端日志
./manage.sh logs frontend

# 查看最新100行日志
./manage.sh logs backend 100
```

## 文件结构

- `client/` - 前端应用
  - `src/components/` - React组件
  - `src/hooks/` - 自定义钩子
  - `src/services/` - API服务
- `server/` - 后端应用
  - `app.py` - 主应用
- `manage.sh` - 管理脚本
- `test_backend.py` - 后端测试脚本
- `simple_test.py` - 简单测试脚本
- `test_backend_connection.js` - JavaScript测试脚本

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 开源许可

此项目采用 MIT 许可证。
## 日志文件

项目日志链接位于 `logs_latest` 目录：

- `backend.log` - 后端服务最新日志
- `frontend.log` - 前端服务最新日志

可以通过 `logs_latest/服务名.log` 快速访问最新日志，无需在 `logs` 目录中寻找特定日期的文件。
