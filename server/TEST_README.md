# OpenRouter API 测试工具

本目录包含用于测试与 OpenRouter API 连接的工具。测试代码位于 `tests` 目录下，可以通过 `run_tests.py` 统一运行。

## 测试脚本结构

- `run_tests.py` - 主测试管理脚本
- `tests/` - 测试模块目录
  - `openrouter_simple.py` - 简单测试
  - `openrouter_direct.py` - 直接测试
  - `openrouter_cli.py` - 命令行版本测试

## 环境配置

这些测试需要在 `.env` 文件中配置 OpenRouter API 密钥。请确保设置了以下环境变量：

```
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL_NAME=model_name  # 可选，默认使用 qwen/qwen3-1.7b:free
```

## 使用方法

### 运行所有测试

```bash
python run_tests.py
# 或
python run_tests.py all
```

### 运行特定测试

```bash
# 运行简单测试
python run_tests.py simple

# 运行直接测试
python run_tests.py direct

# 运行命令行测试
python run_tests.py cli
```

### 向测试传递参数

对于支持命令行参数的测试（如 CLI 测试），可以通过 `--args` 传递参数：

```bash
# 使用特定模型进行测试
python run_tests.py cli --args --model "meta-llama/llama-3-8b-instruct" --max-tokens 100

# 使用流式响应
python run_tests.py cli --args --stream

# 设置超时时间
python run_tests.py cli --args --timeout 300
```

## 测试模块说明

### 简单测试 (simple)

最基础的测试，使用硬编码参数发送一个请求到 OpenRouter API。

### 直接测试 (direct)

支持命令行参数的测试，可以测试不同查询内容和模型。

示例：
```bash
python tests/openrouter_direct.py --query "Hello, world!" --model "openai/gpt-4o" --stream
```

### 命令行测试 (cli)

最全面的测试，支持丰富的命令行参数，可以控制各种请求参数。

支持的参数：
- `--query`, `-q` - 测试查询内容
- `--system`, `-S` - 系统提示消息
- `--model`, `-m` - 使用的模型名称
- `--stream`, `-s` - 使用流式响应
- `--max-tokens`, `-t` - 最大生成token数
- `--temperature`, `-T` - 温度参数 (0-2之间)
- `--timeout` - 请求超时时间 (秒)
- `--api-key`, `-k` - 指定API密钥
- `--base-url`, `-u` - 指定API基础URL
- `--referer`, `-r` - HTTP-Referer头部
- `--title`, `-x` - X-Title头部

示例：
```bash
python tests/openrouter_cli.py --model "meta-llama/llama-3-8b-instruct" --stream --max-tokens 200
```

## 排查超时问题

如果遇到请求超时问题，可以尝试以下方法：

1. 增加超时时间：
   ```bash
   python run_tests.py cli --args --timeout 300
   ```

2. 使用不同的模型，一些模型可能响应较慢：
   ```bash
   python run_tests.py cli --args --model "meta-llama/llama-3-8b-instruct"
   ```

3. 检查网络连接，确保可以正常访问 openrouter.ai

## 开发者信息

这些测试脚本使用 OpenAI Python SDK 连接 OpenRouter.ai API，可以帮助验证 API 配置是否正确。 

本目录包含用于测试与 OpenRouter API 连接的工具。测试代码位于 `tests` 目录下，可以通过 `run_tests.py` 统一运行。

## 测试脚本结构

- `run_tests.py` - 主测试管理脚本
- `tests/` - 测试模块目录
  - `openrouter_simple.py` - 简单测试
  - `openrouter_direct.py` - 直接测试
  - `openrouter_cli.py` - 命令行版本测试

## 环境配置

这些测试需要在 `.env` 文件中配置 OpenRouter API 密钥。请确保设置了以下环境变量：

```
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL_NAME=model_name  # 可选，默认使用 qwen/qwen3-1.7b:free
```

## 使用方法

### 运行所有测试

```bash
python run_tests.py
# 或
python run_tests.py all
```

### 运行特定测试

```bash
# 运行简单测试
python run_tests.py simple

# 运行直接测试
python run_tests.py direct

# 运行命令行测试
python run_tests.py cli
```

### 向测试传递参数

对于支持命令行参数的测试（如 CLI 测试），可以通过 `--args` 传递参数：

```bash
# 使用特定模型进行测试
python run_tests.py cli --args --model "meta-llama/llama-3-8b-instruct" --max-tokens 100

# 使用流式响应
python run_tests.py cli --args --stream

# 设置超时时间
python run_tests.py cli --args --timeout 300
```

## 测试模块说明

### 简单测试 (simple)

最基础的测试，使用硬编码参数发送一个请求到 OpenRouter API。

### 直接测试 (direct)

支持命令行参数的测试，可以测试不同查询内容和模型。

示例：
```bash
python tests/openrouter_direct.py --query "Hello, world!" --model "openai/gpt-4o" --stream
```

### 命令行测试 (cli)

最全面的测试，支持丰富的命令行参数，可以控制各种请求参数。

支持的参数：
- `--query`, `-q` - 测试查询内容
- `--system`, `-S` - 系统提示消息
- `--model`, `-m` - 使用的模型名称
- `--stream`, `-s` - 使用流式响应
- `--max-tokens`, `-t` - 最大生成token数
- `--temperature`, `-T` - 温度参数 (0-2之间)
- `--timeout` - 请求超时时间 (秒)
- `--api-key`, `-k` - 指定API密钥
- `--base-url`, `-u` - 指定API基础URL
- `--referer`, `-r` - HTTP-Referer头部
- `--title`, `-x` - X-Title头部

示例：
```bash
python tests/openrouter_cli.py --model "meta-llama/llama-3-8b-instruct" --stream --max-tokens 200
```

## 排查超时问题

如果遇到请求超时问题，可以尝试以下方法：

1. 增加超时时间：
   ```bash
   python run_tests.py cli --args --timeout 300
   ```

2. 使用不同的模型，一些模型可能响应较慢：
   ```bash
   python run_tests.py cli --args --model "meta-llama/llama-3-8b-instruct"
   ```

3. 检查网络连接，确保可以正常访问 openrouter.ai

## 开发者信息

这些测试脚本使用 OpenAI Python SDK 连接 OpenRouter.ai API，可以帮助验证 API 配置是否正确。 