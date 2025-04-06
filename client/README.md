# Mini ChatBot 前端架构

## 目录结构

```
client/src/
├── api/                  # API 相关函数
├── components/           # 组件目录
│   ├── chat/             # 聊天相关组件
│   │   ├── ChatArea.jsx  # 聊天区域主组件
│   │   ├── ChatHeader.jsx # 聊天头部组件
│   │   ├── MessageInput.jsx # 消息输入组件
│   │   └── MessageList.jsx # 消息列表组件
│   ├── document/         # 文档处理相关组件
│   ├── settings/         # 设置相关组件
│   │   └── Settings.jsx  # 设置面板组件
│   ├── sidebar/          # 侧边栏相关组件
│   │   └── Sidebar.jsx   # 侧边栏组件
│   ├── ui/               # 通用UI组件
│   ├── ErrorBoundary.jsx # 错误边界组件
│   ├── MessageBubble.jsx # 消息气泡组件
│   └── SensitiveInfoDemo.jsx # 敏感信息演示组件
├── hooks/                # 自定义钩子
│   ├── index.js          # 钩子导出入口
│   ├── useChatCore.js    # 核心聊天功能钩子
│   ├── useChatLogic.js   # 聊天逻辑整合钩子
│   ├── useConversations.js # 会话管理钩子
│   ├── useFileUpload.js  # 文件上传钩子
│   ├── useMessageSubmission.js # 消息提交钩子
│   ├── useSensitiveInfo.js # 敏感信息处理钩子
│   ├── useTheme.js       # 主题钩子
│   └── useUIState.js     # UI状态钩子
├── utils/                # 工具函数
│   ├── index.js          # 工具函数导出入口
│   ├── deepResearch.js   # 深度研究相关函数
│   ├── messageUtils.js   # 消息处理工具函数
│   ├── SensitiveInfoMasker.js # 敏感信息掩码工具
│   ├── sessionManager.js # 会话管理工具
│   ├── sessionUtils.js   # 会话工具函数
│   ├── UIUtils.js        # UI相关工具函数
│   └── webSearch.js      # 网络搜索工具函数
├── App.jsx               # 应用主组件
├── Chat.jsx              # 聊天页面组件
├── Chat.css              # 聊天页面样式
├── Config.js             # 配置文件
├── index.css             # 主样式文件
└── main.jsx              # 应用入口文件
```

## 核心流程

### 1. 消息发送流程

当用户发送消息时，前端会经历以下流程：

1. **用户输入处理**：
   - 用户在 `MessageInput` 组件中输入消息
   - 可以选择深度研究、联网搜索等选项

2. **消息提交**：
   - 用户点击发送或按回车键触发 `handleSubmit` 函数
   - `handleSubmit` 函数在 `useMessageSubmission` 钩子中定义

3. **消息预处理**：
   - 如果启用了敏感信息保护，会对消息进行掩码处理
   - 创建用户消息对象并添加到 `displayMessages` 中
   - 将消息添加到 localStorage 中的会话历史记录

4. **API 请求**：
   - 调用 `sendChatRequest` 函数发送消息到后端
   - 如果有活动文档，则调用 `sendDocumentChatRequest`
   - 设置 `streaming` 状态为 true，表示正在接收流式响应

5. **流式响应处理**：
   - 接收流式响应，并实时更新 `currentResponse`
   - 如果有推理过程，同时更新 `reasoningText`
   - 响应结束后，调用 `handleReplyComplete` 保存最终响应

6. **响应结束处理**：
   - 将完整响应作为一条 AI 消息添加到 `displayMessages`
   - 更新 localStorage 中的会话历史
   - 设置 `streaming` 状态为 false，恢复输入框

### 2. 会话切换流程

当用户切换会话时：

1. **点击会话**：
   - 用户在侧边栏点击某个会话，触发 `handleConversationClick` 函数
   - `handleConversationClick` 在 `useConversations` 钩子中定义

2. **保存当前会话**：
   - 获取当前活动会话，保存其消息和状态
   - 在切换前记录当前会话的 `sessionHash`

3. **加载新会话**：
   - 更新 `conversations` 中各个会话的 `active` 状态
   - 加载目标会话的消息到 `displayMessages`
   - 更新 `sessionHash` 为目标会话的哈希值

4. **处理会话关联数据**：
   - 加载目标会话的活动文档
   - 如果启用了敏感信息保护，加载相关的敏感信息映射表

5. **UI 更新**：
   - 重置滚动位置
   - 重置流式响应状态
   - 更新 localStorage 中的会话数据

### 3. 消息保存机制

消息保存是关键功能，特别是在会话切换时，确保消息不丢失：

1. **会话哈希跟踪**：
   - 使用 `lastSessionRef` 记录上一个会话哈希
   - 检测会话哈希变化来确定会话是否已切换

2. **多级保存策略**：
   - 首先尝试将消息保存到原始会话
   - 如果找不到原始会话，尝试使用消息自身的会话哈希
   - 进一步查找匹配度最高的会话（基于用户消息内容）
   - 最后才保存到当前活动会话

3. **重复消息检查**：
   - 保存前检查消息是否已存在于目标会话中
   - 防止重复添加相同消息

4. **会话状态更新**：
   - 更新目标会话的 `lastUpdated` 时间戳
   - 更新 localStorage 中的会话数据

## 主要数据结构

### 消息对象

```javascript
{
  id: String,              // 消息唯一ID
  role: String,            // 消息角色（user/assistant/system）
  content: String,         // 消息内容
  reasoning_content: String, // 推理过程内容（可选）
  timestamp: Number,       // 时间戳
  sessionHash: String,     // 所属会话哈希
  originalContent: String  // 原始内容（在敏感信息保护开启时使用）
}
```

### 会话对象

```javascript
{
  id: String,              // 会话唯一ID
  title: String,           // 会话标题
  active: Boolean,         // 是否为活动会话
  messages: Array,         // 消息数组
  timestamp: Number,       // 创建/更新时间戳
  sessionHash: String,     // 会话哈希值
  activeDocuments: Array,  // 活动文档列表
  lastUpdated: Number      // 最后更新时间戳
}
```

## 代码模块化设计

Mini ChatBot 前端采用模块化设计，各模块职责明确：

1. **React 组件**：负责 UI 渲染和用户交互
2. **Custom Hooks**：负责状态管理和业务逻辑
3. **Utility 函数**：负责通用功能和工具方法

主要模块：

- **useChatCore**: 处理核心聊天功能，如消息显示、滚动处理等
- **useConversations**: 管理会话列表、切换、创建和删除会话
- **useMessageSubmission**: 处理消息发送、重试、编辑等
- **useSensitiveInfo**: 处理敏感信息保护相关功能
- **useFileUpload**: 处理文档上传和管理功能

这种模块化设计使代码更易于维护和扩展。 