# 测试工具说明

本目录包含项目的各种测试工具和脚本，用于验证和测试应用的不同部分。测试代码已被整合到此目录以便统一管理。

## 目录结构

- `run_tests.py` - 统一测试管理脚本，可以运行所有测试或特定测试
- `openrouter_test.py` - OpenRouter.ai API 统一测试脚本
- `log_manager.py` - 日志链接管理工具，创建指向最新日志的软链接
- `scripts/` - 测试相关的辅助脚本和shell脚本
  - `test_all.sh` - 一键测试脚本，可运行所有测试并查看结果
- `js/` - JavaScript测试脚本
- `python/` - Python测试脚本
- `logs/` - 测试产生的日志存储目录

## 主要测试工具

### 一键测试脚本 (test_all.sh)

这是最简单的测试方法，脚本会自动运行所有测试并显示结果：

```bash
# 直接运行项目根目录的脚本
./test_all.sh

# 或使用测试目录中的脚本
./tests/scripts/test_all.sh
```

脚本会自动执行以下步骤：
1. 检查并确保服务正在运行
2. 收集项目中的测试文件
3. 运行JavaScript测试
4. 运行Python简单测试
5. 运行Python完整测试
6. 打开浏览器进行Web界面测试
7. 显示测试结果摘要

### 统一测试管理器 (run_tests.py)

这是一个主测试工具，可以查找和运行项目中所有的测试脚本。

**使用方法**：

```bash
# 运行所有测试
python tests/run_tests.py

# 只运行 OpenRouter API 测试
python tests/run_tests.py --openrouter

# 只运行后端测试
python tests/run_tests.py --backend

# 只更新日志链接
python tests/run_tests.py --update-logs

# 收集项目中的测试文件
python tests/run_tests.py --collect-tests

# 传递额外参数给特定测试
python tests/run_tests.py --openrouter --args --model "meta-llama/llama-3-8b-instruct" --stream
```

### 测试文件收集器

此功能用于在项目中查找所有与测试相关的文件，并将它们组织到测试目录中，使测试管理更加集中和高效。

**功能**：
- 在整个项目目录中搜索测试文件
- 根据文件类型将它们分类并复制到适当的子目录
- 自动处理名称冲突，避免文件覆盖
- 生成测试文件汇总文档

**使用方法**：

```bash
# 使用测试管理脚本
python tests/run_tests.py --collect-tests

# 或者使用管理脚本
./manage.sh test collect-tests
```

### OpenRouter API 测试 (openrouter_test.py)

这是一个专门用于测试与 OpenRouter.ai API 连接的工具，统一了三个之前的测试版本。

**功能**：
- 支持常规请求和流式响应测试
- 支持配置不同的模型、系统提示和查询内容
- 提供三种输出模式：simple (简洁)、normal (标准)、debug (详细)

**使用方法**：

```bash
# 基本用法
python tests/openrouter_test.py

# 使用特定模型
python tests/openrouter_test.py --model "meta-llama/llama-3-8b-instruct"

# 测试流式响应
python tests/openrouter_test.py --stream

# 详细模式，显示完整响应
python tests/openrouter_test.py --mode debug

# 设置超时时间
python tests/openrouter_test.py --timeout 180
```

### 日志链接管理器 (log_manager.py)

此工具会创建指向最新日志文件的符号链接，使得查看日志更加方便。

**功能**：
- 查找 logs 目录中每个服务的最新日志文件
- 创建符号链接到 logs_latest 目录
- 可选更新 README.md 添加日志链接说明

**使用方法**：

```bash
# 基本用法
python tests/log_manager.py

# 显示详细信息
python tests/log_manager.py --verbose

# 同时更新 README.md
python tests/log_manager.py --update-readme
```

## 环境配置

这些测试需要在 `.env` 文件中配置 API 密钥和其他设置。请确保设置了以下环境变量：

```
# OpenRouter API 设置
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL_NAME=meta-llama/llama-3-8b-instruct

# 后端服务设置
BACKEND_URL=http://localhost:5001
```

## 重构说明

之前的三个 OpenRouter 测试版本 (simple、direct、cli) 已被合并为一个统一的 `openrouter_test.py` 脚本，该脚本继承了原来三个版本的所有功能，并通过 `--mode` 参数提供不同的输出详细程度。

现在，项目中的所有测试文件都可以通过测试文件收集器功能被自动整合到此测试目录，以便统一管理和执行。收集后的测试文件会按照类型分类存放在相应的子目录中。 

本目录包含项目的各种测试工具和脚本，用于验证和测试应用的不同部分。测试代码已被整合到此目录以便统一管理。

## 目录结构

- `run_tests.py` - 统一测试管理脚本，可以运行所有测试或特定测试
- `openrouter_test.py` - OpenRouter.ai API 统一测试脚本
- `log_manager.py` - 日志链接管理工具，创建指向最新日志的软链接
- `scripts/` - 测试相关的辅助脚本和shell脚本
  - `test_all.sh` - 一键测试脚本，可运行所有测试并查看结果
- `js/` - JavaScript测试脚本
- `python/` - Python测试脚本
- `logs/` - 测试产生的日志存储目录

## 主要测试工具

### 一键测试脚本 (test_all.sh)

这是最简单的测试方法，脚本会自动运行所有测试并显示结果：

```bash
# 直接运行项目根目录的脚本
./test_all.sh

# 或使用测试目录中的脚本
./tests/scripts/test_all.sh
```

脚本会自动执行以下步骤：
1. 检查并确保服务正在运行
2. 收集项目中的测试文件
3. 运行JavaScript测试
4. 运行Python简单测试
5. 运行Python完整测试
6. 打开浏览器进行Web界面测试
7. 显示测试结果摘要

### 统一测试管理器 (run_tests.py)

这是一个主测试工具，可以查找和运行项目中所有的测试脚本。

**使用方法**：

```bash
# 运行所有测试
python tests/run_tests.py

# 只运行 OpenRouter API 测试
python tests/run_tests.py --openrouter

# 只运行后端测试
python tests/run_tests.py --backend

# 只更新日志链接
python tests/run_tests.py --update-logs

# 收集项目中的测试文件
python tests/run_tests.py --collect-tests

# 传递额外参数给特定测试
python tests/run_tests.py --openrouter --args --model "meta-llama/llama-3-8b-instruct" --stream
```

### 测试文件收集器

此功能用于在项目中查找所有与测试相关的文件，并将它们组织到测试目录中，使测试管理更加集中和高效。

**功能**：
- 在整个项目目录中搜索测试文件
- 根据文件类型将它们分类并复制到适当的子目录
- 自动处理名称冲突，避免文件覆盖
- 生成测试文件汇总文档

**使用方法**：

```bash
# 使用测试管理脚本
python tests/run_tests.py --collect-tests

# 或者使用管理脚本
./manage.sh test collect-tests
```

### OpenRouter API 测试 (openrouter_test.py)

这是一个专门用于测试与 OpenRouter.ai API 连接的工具，统一了三个之前的测试版本。

**功能**：
- 支持常规请求和流式响应测试
- 支持配置不同的模型、系统提示和查询内容
- 提供三种输出模式：simple (简洁)、normal (标准)、debug (详细)

**使用方法**：

```bash
# 基本用法
python tests/openrouter_test.py

# 使用特定模型
python tests/openrouter_test.py --model "meta-llama/llama-3-8b-instruct"

# 测试流式响应
python tests/openrouter_test.py --stream

# 详细模式，显示完整响应
python tests/openrouter_test.py --mode debug

# 设置超时时间
python tests/openrouter_test.py --timeout 180
```

### 日志链接管理器 (log_manager.py)

此工具会创建指向最新日志文件的符号链接，使得查看日志更加方便。

**功能**：
- 查找 logs 目录中每个服务的最新日志文件
- 创建符号链接到 logs_latest 目录
- 可选更新 README.md 添加日志链接说明

**使用方法**：

```bash
# 基本用法
python tests/log_manager.py

# 显示详细信息
python tests/log_manager.py --verbose

# 同时更新 README.md
python tests/log_manager.py --update-readme
```

## 环境配置

这些测试需要在 `.env` 文件中配置 API 密钥和其他设置。请确保设置了以下环境变量：

```
# OpenRouter API 设置
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL_NAME=meta-llama/llama-3-8b-instruct

# 后端服务设置
BACKEND_URL=http://localhost:5001
```

## 重构说明

之前的三个 OpenRouter 测试版本 (simple、direct、cli) 已被合并为一个统一的 `openrouter_test.py` 脚本，该脚本继承了原来三个版本的所有功能，并通过 `--mode` 参数提供不同的输出详细程度。

现在，项目中的所有测试文件都可以通过测试文件收集器功能被自动整合到此测试目录，以便统一管理和执行。收集后的测试文件会按照类型分类存放在相应的子目录中。 