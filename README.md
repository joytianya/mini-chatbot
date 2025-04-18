# 聊天机器人应用

这是一个功能丰富的聊天机器人应用，包含前端界面和后端API服务。应用支持多种功能，包括会话管理、文件上传、敏感信息保护和联网搜索等高级功能。可以与多种大语言模型对接，并支持流式响应、思考过程可视化和完整的会话持久化。

## 项目结构

```
.
├── client/                  # 前端React应用
│   ├── public/              # 公共资源
│   ├── src/                 # 源代码
│   │   ├── api/             # API接口调用
│   │   ├── components/      # UI组件
│   │   │   ├── ChatArea.jsx       # 聊天区域组件
│   │   │   ├── MessageBubble.jsx  # 消息气泡组件
│   │   │   ├── Sidebar.jsx        # 侧边栏组件
│   │   │   ├── Settings.jsx       # 设置组件
│   │   │   ├── Upload.jsx         # 文件上传组件
│   │   │   └── ...
│   │   ├── hooks/           # 自定义React钩子
│   │   │   ├── useMessageHandling.js     # 消息处理钩子
│   │   │   ├── useConversationManagement.js # 会话管理钩子
│   │   │   ├── useFileHandling.js        # 文件处理钩子
│   │   │   └── useTheme.js               # 主题处理钩子
│   │   ├── utils/           # 工具函数
│   │   ├── App.jsx          # 主应用组件
│   │   ├── main.jsx         # 入口文件
│   │   └── Config.js        # 配置文件
│   ├── index.html           # HTML入口文件
│   ├── package.json         # 项目依赖配置
│   └── vite.config.js       # Vite配置
│
├── server/                  # 后端Python服务
│   ├── agents/              # AI智能代理
│   ├── routes/              # API路由
│   ├── utils/               # 工具函数
│   ├── documents/           # 上传文档存储
│   ├── faiss_index/         # 向量数据库索引
│   ├── logs/                # 日志文件
│   ├── app.py               # 主应用入口
│   ├── document_store.py    # 文档存储管理
│   ├── searx_client.py      # 搜索客户端
│   └── requirements.txt     # Python依赖
│
├── start-client.sh          # 启动前端脚本
├── start-python-server.sh   # 启动后端脚本
└── .gitignore               # Git忽略配置
```

## 客户端（前端）

### 主要组件

#### 1. App.jsx
主应用组件，负责组织整体布局和状态管理。集成了侧边栏和聊天区域，处理会话管理和消息传递。主要功能：
- 初始化应用状态和全局配置
- 管理组件间通信和数据流
- 处理会话的创建、切换和删除
- 集成消息处理和会话管理钩子
- 确保AI回复正确保存到localStorage

#### 2. ChatArea.jsx
聊天界面核心组件，负责显示消息历史、处理用户输入和显示AI回复。特性包括：
- 实时消息流式展示
- 思考过程展示和折叠
- 代码高亮（支持多种编程语言）
- 消息自动滚动到视图
- 消息编辑和重试功能
- 独立的消息保存机制（确保即使外部函数失败也能保存AI回复）
- 深度研究和联网搜索模式选择

#### 3. MessageBubble.jsx
消息气泡组件，负责单条消息的展示，支持：
- 用户/AI消息样式区分
- Markdown渲染与代码高亮
- 复制、编辑和重试操作
- 思考过程展示与折叠功能
- 自适应暗色/亮色模式
- 高亮显示当前活动消息

#### 4. Sidebar.jsx
侧边栏组件，提供会话列表和操作功能：
- 会话创建、切换和删除
- 会话列表展示和搜索
- 设置面板访问
- 文件上传功能
- 暗色/亮色模式切换
- 可折叠设计，增加聊天区域空间

#### 5. Settings.jsx
设置面板组件，允许用户配置：
- 多模型配置和拖拽排序
- API密钥管理和验证
- 高级功能开关配置
- Embedding模型设置
- 系统提示词自定义

#### 6. Upload.jsx 和 DocumentUploader.jsx
文件上传相关组件，支持向AI提供文档上下文：
- 多文件上传与拖放支持
- 上传进度显示
- 多种文档格式支持（PDF、DOCX、TXT等）
- 文档处理状态反馈
- 已上传文档管理

#### 7. SensitiveInfoEditor.jsx
敏感信息保护组件，帮助用户屏蔽敏感信息：
- 自动检测敏感信息模式
- 自定义敏感信息屏蔽
- 提供敏感信息预览和编辑
- 支持多种敏感信息类型（密码、API密钥、个人信息等）

### 自定义钩子

#### 1. useMessageHandling.js
处理消息相关逻辑的钩子，是消息处理的核心：
- 发送和接收消息
- 流式响应处理和实时显示
- 消息存储、加载和持久化
- 思考过程处理和展示
- 防止消息丢失的多层保护机制
- 处理消息编辑和重试

#### 2. useConversationManagement.js
管理会话相关功能的钩子：
- 创建新会话和会话标题管理
- 切换会话（保存当前状态并加载新状态）
- 删除会话和会话清理
- 会话持久化到localStorage
- 会话历史导入/导出
- 自动保存用户操作状态

#### 3. useFileHandling.js
处理文件上传和文档处理的钩子：
- 文件上传和状态管理
- 文档解析和文本提取
- 文档上下文管理和会话关联
- 多文件批量处理
- 错误处理和重试机制

#### 4. useTheme.js
管理应用主题的钩子：
- 切换暗色/亮色模式
- 保存主题偏好到localStorage
- 根据系统设置自动选择主题
- 动态应用主题变化

## 服务器（后端）

### 主要模块

#### 1. app.py
后端服务主入口，负责路由管理和请求处理：
- 初始化Flask应用和API路由
- 提供聊天会话端点
- 处理文档上传和管理
- 实现流式响应
- 错误处理和日志记录
- CORS和安全配置

#### 2. document_store.py
文档存储和检索系统，支持：
- 文档上传和持久化存储
- 文本提取和处理
- 向量化和索引构建
- 相似度搜索和内容检索
- 缓存管理和性能优化
- 多种文档格式支持

#### 3. searx_client.py 和 web_kg.py
提供联网搜索功能，允许AI访问实时互联网信息：
- 安全的搜索请求代理
- 搜索结果处理和格式化
- 多搜索引擎支持
- 结果缓存和去重
- 知识图谱构建
- 搜索策略优化

#### 4. agents/
包含各种智能代理实现，如研究代理、问答代理等：
- 研究代理：深入分析复杂问题
- 问答代理：简明回答直接问题
- 文档代理：处理文档相关查询
- 工具使用代理：调用外部工具和API
- 多Agent协作系统

#### 5. system_prompts.py
系统提示管理，用于控制AI行为和能力：
- 定义不同场景的系统提示
- 提供情境感知的提示词切换
- 多语言提示支持
- 提示词模板和变量插入
- 用户自定义提示词管理

## 关键实现特性

### 1. 消息处理流程
整个应用的消息处理流程包含以下核心步骤：
- 用户消息创建并立即保存到localStorage
- 消息通过API发送到后端
- 后端处理消息并启动流式响应
- 前端接收流式响应并实时更新UI
- 响应完成后保存AI回复到localStorage
- 多层保护机制确保消息不会丢失

### 2. 会话持久化机制
应用采用多层会话持久化策略：
- 即时保存：用户发送消息后立即保存
- 完成保存：AI回复完成后自动保存
- 切换保存：会话切换前保存当前状态
- 备份机制：多个保存点和恢复机制
- localStorage管理：优化存储空间使用

### 3. 流式响应实现
实现了完整的流式响应处理：
- 服务端使用Flask的流式响应
- 前端使用Reader API处理流数据
- 实时解析和展示增量更新
- 支持思考过程和回复的分离展示
- 可中断的请求处理

### 4. 文档处理系统
强大的文档处理功能：
- 多格式文档解析（PDF、DOCX、TXT等）
- 文本分块和向量化
- FAISS向量索引构建
- 相似度搜索和相关内容检索
- 文档上下文与会话集成

## 功能特性

1. **多会话管理**: 创建、切换和删除多个对话会话
2. **消息持久化**: 自动保存所有消息历史到本地存储
3. **流式响应**: 实时显示AI回复，无需等待完整响应
4. **思考过程**: 展示AI的推理过程，提供更多透明度
5. **编辑功能**: 允许编辑已发送消息并获取更新回复
6. **文件上传**: 上传文档作为对话上下文
7. **敏感信息保护**: 自动屏蔽敏感内容
8. **联网搜索**: 访问实时互联网信息
9. **代码高亮**: 美观地展示代码块
10. **深色模式**: 支持暗色/亮色主题切换
11. **响应式设计**: 适配不同屏幕尺寸

## 安装和使用

### 前端设置

```bash
cd client
npm install
npm run dev
```

### 后端设置

```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

或使用提供的脚本:

```bash
./start-client.sh
./start-python-server.sh
```

## 环境变量

服务器端需要配置以下环境变量（在server/.env文件中）:

- `OPENAI_API_KEY`: 用于OpenAI API调用
- `JINA_API_KEY`: 用于Jina嵌入（可选）
- `SEARX_INSTANCES`: 用于web搜索功能（可选）

## 技术栈

- **前端**: React, Vite, JavaScript/JSX, CSS
- **后端**: Python, Flask, FAISS
- **AI接口**: OpenAI API, 本地模型支持
- **数据存储**: 浏览器localStorage, 服务器文件系统

## 开发注意事项

1. **消息保存机制**:
   - 应用实现了多层保护机制确保消息不会丢失
   - `ChatArea.jsx`中包含独立的消息保存逻辑
   - `useMessageHandling.js`提供主要的消息处理功能
   - 编辑后的消息会保留到编辑点，之后的消息会被移除

2. **状态管理**:
   - 应用使用React状态和钩子管理复杂UI状态
   - 会话状态保存在localStorage中
   - 文档和模型配置也存储在localStorage

3. **扩展模型支持**:
   - 在Settings组件中可以添加新的模型配置
   - 所有模型配置保存在localStorage
   - 支持自定义基础URL和API密钥

## 许可

MIT License