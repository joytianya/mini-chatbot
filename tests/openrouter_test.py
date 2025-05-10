#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
OpenRouter.ai API 统一测试脚本
集成了简单测试、直接测试和CLI测试的功能
"""

import os
import sys
import time
import json
import argparse
from dotenv import load_dotenv
from openai import OpenAI
from pathlib import Path
import textwrap

# 添加项目根目录到 Python 路径
script_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(script_dir))

# 加载环境变量
# 优先从server/.env加载，因为后端服务使用此配置
server_env_path = script_dir / "server" / ".env"
if server_env_path.exists():
    load_dotenv(dotenv_path=server_env_path)
    print(f"已从 {server_env_path} 加载环境变量")
else:
    # 如果server/.env不存在，尝试从项目根目录加载
    root_env_path = script_dir / ".env"
    if root_env_path.exists():
        load_dotenv(dotenv_path=root_env_path)
        print(f"已从 {root_env_path} 加载环境变量")
    else:
        print(f"警告: 未找到环境变量文件，请确保在server/.env或项目根目录的.env中配置API密钥")

# ANSI 颜色代码
COLORS = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "red": "\033[91m",
    "green": "\033[92m",
    "yellow": "\033[93m",
    "blue": "\033[94m",
    "magenta": "\033[95m",
    "cyan": "\033[96m",
}

def colorize(text, color, bold=False):
    """为文本添加颜色"""
    if bold:
        return f"{COLORS['bold']}{COLORS[color]}{text}{COLORS['reset']}"
    return f"{COLORS[color]}{text}{COLORS['reset']}"

def print_header(title):
    """打印格式化的标题"""
    border = "=" * 60
    print(f"\n{colorize(border, 'blue')}")
    print(f"{colorize(title.center(60), 'cyan', True)}")
    print(f"{colorize(border, 'blue')}\n")

def print_info(key, value):
    """打印格式化的键值对信息"""
    print(f"{colorize(key + ':', 'green', True)} {value}")

def print_error(message):
    """打印错误信息"""
    print(f"{colorize('错误:', 'red', True)} {message}")

def print_success(message):
    """打印成功信息"""
    print(f"{colorize('✓', 'green', True)} {message}")

def run_test(args):
    """运行OpenRouter API测试
    
    Args:
        args: 解析后的命令行参数
        
    Returns:
        bool: 测试是否成功
    """
    # 获取API密钥
    api_key = args.api_key or os.getenv('OPENROUTER_API_KEY')
    if not api_key:
        print_error("缺少API密钥，请设置OPENROUTER_API_KEY环境变量或使用--api-key参数")
        print_info("提示", "您可以通过以下方式设置API密钥:")
        print("1. 在server/.env文件中添加 OPENROUTER_API_KEY=your_key")
        print("2. 使用命令行参数: --api-key your_key")
        return False
    
    # 初始化客户端
    print_info("初始化OpenAI客户端", "")
    client = OpenAI(
        base_url=args.base_url,
        api_key=api_key,
        timeout=args.timeout,
    )
    
    # 设置额外的HTTP头部
    extra_headers = {
        "HTTP-Referer": args.referer,
        "X-Title": args.title,
    }
    
    # 准备消息
    messages = []
    if args.system:
        messages.append({
            "role": "system",
            "content": args.system
        })
    
    messages.append({
        "role": "user",
        "content": args.query
    })
    
    # 打印测试信息
    print_header(f"OpenRouter API 测试 - {args.mode.capitalize()}模式")
    print_info("模型", args.model)
    print_info("API基础URL", args.base_url)
    if args.system:
        print_info("系统提示", args.system)
    print_info("查询", args.query)
    print_info("流式响应", "是" if args.stream else "否")
    print_info("最大Token数", args.max_tokens)
    print_info("温度参数", args.temperature)
    print_info("HTTP-Referer", args.referer)
    print_info("X-Title", args.title)
    print_info("超时时间", f"{args.timeout}秒")
    
    print(f"\n{colorize('正在连接OpenRouter.ai API...', 'yellow')}")
    
    # 记录开始时间
    start_time = time.time()
    
    try:
        if not args.stream:
            # 非流式响应
            completion = client.chat.completions.create(
                model=args.model,
                messages=messages,
                max_tokens=args.max_tokens,
                temperature=args.temperature,
                extra_headers=extra_headers
            )
            
            # 计算响应时间
            elapsed_time = time.time() - start_time
            print_info("\n响应时间", f"{elapsed_time:.2f}秒")
            
            # 根据模式显示不同详细程度的输出
            if args.mode == "debug":
                print_info("完整响应", "")
                print(json.dumps(completion.model_dump(), ensure_ascii=False, indent=2))
            
            print_header("回复内容")
            print(completion.choices[0].message.content)
            
        else:
            # 流式响应
            print_header("流式响应内容")
            content_buffer = []
            reasoning_buffer = []
            
            for chunk in client.chat.completions.create(
                model=args.model,
                messages=messages,
                max_tokens=args.max_tokens,
                temperature=args.temperature,
                stream=True,
                extra_headers=extra_headers
            ):
                # 处理内容和思考过程
                delta = chunk.choices[0].delta
                
                if hasattr(delta, 'content') and delta.content:
                    content_buffer.append(delta.content)
                    print(delta.content, end="", flush=True)
                
                # 有的模型可能支持reasoning_content
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    reasoning_buffer.append(delta.reasoning_content)
                    # 在debug模式下显示思考过程
                    if args.mode == "debug":
                        print(f"{colorize('[思考]', 'magenta')} {delta.reasoning_content}", end="", flush=True)
            
            # 打印完成信息
            elapsed_time = time.time() - start_time
            print(f"\n\n{colorize('响应时间:', 'green', True)} {elapsed_time:.2f}秒")
            
            # 在debug模式下保存完整内容
            if args.mode == "debug" and content_buffer:
                content = "".join(content_buffer)
                reasoning = "".join(reasoning_buffer)
                
                # 保存到文件
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                logs_dir = script_dir / "tests" / "logs"
                logs_dir.mkdir(exist_ok=True, parents=True)
                
                with open(f"{logs_dir}/response_{timestamp}.txt", "w", encoding="utf-8") as f:
                    f.write(f"===== 查询 =====\n{args.query}\n\n")
                    if reasoning:
                        f.write(f"===== 思考过程 =====\n{reasoning}\n\n")
                    f.write(f"===== 回复内容 =====\n{content}\n")
                
                print_info("完整响应已保存到", f"tests/logs/response_{timestamp}.txt")
            
        return True
            
    except Exception as e:
        print_error(f"{str(e)}")
        if args.mode == "debug":
            import traceback
            print(traceback.format_exc())
        return False

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='OpenRouter API 统一测试脚本')
    
    # 基本参数
    parser.add_argument('--query', '-q', type=str, default="你好，请用中文介绍一下自己。", 
                        help='要发送的查询内容')
    parser.add_argument('--model', '-m', type=str, default=os.getenv('OPENROUTER_MODEL_NAME', 'meta-llama/llama-3-8b-instruct'),
                        help='使用的模型名称')
    parser.add_argument('--system', '-S', type=str, default="你是一个有用的AI助手。请用中文回答问题。", 
                        help='系统提示消息')
    
    # 流式参数
    parser.add_argument('--stream', '-s', action='store_true', 
                        help='使用流式响应')
    
    # API设置
    parser.add_argument('--api-key', '-k', type=str,
                        help='OpenRouter API密钥 (默认从环境变量读取)')
    parser.add_argument('--base-url', '-u', type=str, default=os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
                        help='API基础URL')
    
    # 生成设置
    parser.add_argument('--max-tokens', '-t', type=int, default=500,
                        help='最大生成token数量')
    parser.add_argument('--temperature', '-T', type=float, default=0.7,
                        help='温度参数 (0-2之间)')
    
    # 请求头设置
    parser.add_argument('--referer', '-r', type=str, default="http://localhost:5173",
                        help='HTTP-Referer头部')
    parser.add_argument('--title', '-x', type=str, default="Mini-Chatbot-Test",
                        help='X-Title头部')
    
    # 其他设置
    parser.add_argument('--timeout', type=int, default=120,
                        help='请求超时时间(秒)')
    parser.add_argument('--mode', choices=['simple', 'normal', 'debug'], default='normal',
                        help='测试模式: simple=简洁输出, normal=标准输出, debug=详细输出')
    
    args = parser.parse_args()
    
    # 执行测试
    success = run_test(args)
    
    # 打印结果
    if success:
        print_success("测试成功完成!")
    else:
        print_error("测试失败!")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main()) 
# -*- coding: utf-8 -*-

"""
OpenRouter.ai API 统一测试脚本
集成了简单测试、直接测试和CLI测试的功能
"""

import os
import sys
import time
import json
import argparse
from dotenv import load_dotenv
from openai import OpenAI
from pathlib import Path
import textwrap

# 添加项目根目录到 Python 路径
script_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(script_dir))

# 加载环境变量
# 优先从server/.env加载，因为后端服务使用此配置
server_env_path = script_dir / "server" / ".env"
if server_env_path.exists():
    load_dotenv(dotenv_path=server_env_path)
    print(f"已从 {server_env_path} 加载环境变量")
else:
    # 如果server/.env不存在，尝试从项目根目录加载
    root_env_path = script_dir / ".env"
    if root_env_path.exists():
        load_dotenv(dotenv_path=root_env_path)
        print(f"已从 {root_env_path} 加载环境变量")
    else:
        print(f"警告: 未找到环境变量文件，请确保在server/.env或项目根目录的.env中配置API密钥")

# ANSI 颜色代码
COLORS = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "red": "\033[91m",
    "green": "\033[92m",
    "yellow": "\033[93m",
    "blue": "\033[94m",
    "magenta": "\033[95m",
    "cyan": "\033[96m",
}

def colorize(text, color, bold=False):
    """为文本添加颜色"""
    if bold:
        return f"{COLORS['bold']}{COLORS[color]}{text}{COLORS['reset']}"
    return f"{COLORS[color]}{text}{COLORS['reset']}"

def print_header(title):
    """打印格式化的标题"""
    border = "=" * 60
    print(f"\n{colorize(border, 'blue')}")
    print(f"{colorize(title.center(60), 'cyan', True)}")
    print(f"{colorize(border, 'blue')}\n")

def print_info(key, value):
    """打印格式化的键值对信息"""
    print(f"{colorize(key + ':', 'green', True)} {value}")

def print_error(message):
    """打印错误信息"""
    print(f"{colorize('错误:', 'red', True)} {message}")

def print_success(message):
    """打印成功信息"""
    print(f"{colorize('✓', 'green', True)} {message}")

def run_test(args):
    """运行OpenRouter API测试
    
    Args:
        args: 解析后的命令行参数
        
    Returns:
        bool: 测试是否成功
    """
    # 获取API密钥
    api_key = args.api_key or os.getenv('OPENROUTER_API_KEY')
    if not api_key:
        print_error("缺少API密钥，请设置OPENROUTER_API_KEY环境变量或使用--api-key参数")
        print_info("提示", "您可以通过以下方式设置API密钥:")
        print("1. 在server/.env文件中添加 OPENROUTER_API_KEY=your_key")
        print("2. 使用命令行参数: --api-key your_key")
        return False
    
    # 初始化客户端
    print_info("初始化OpenAI客户端", "")
    client = OpenAI(
        base_url=args.base_url,
        api_key=api_key,
        timeout=args.timeout,
    )
    
    # 设置额外的HTTP头部
    extra_headers = {
        "HTTP-Referer": args.referer,
        "X-Title": args.title,
    }
    
    # 准备消息
    messages = []
    if args.system:
        messages.append({
            "role": "system",
            "content": args.system
        })
    
    messages.append({
        "role": "user",
        "content": args.query
    })
    
    # 打印测试信息
    print_header(f"OpenRouter API 测试 - {args.mode.capitalize()}模式")
    print_info("模型", args.model)
    print_info("API基础URL", args.base_url)
    if args.system:
        print_info("系统提示", args.system)
    print_info("查询", args.query)
    print_info("流式响应", "是" if args.stream else "否")
    print_info("最大Token数", args.max_tokens)
    print_info("温度参数", args.temperature)
    print_info("HTTP-Referer", args.referer)
    print_info("X-Title", args.title)
    print_info("超时时间", f"{args.timeout}秒")
    
    print(f"\n{colorize('正在连接OpenRouter.ai API...', 'yellow')}")
    
    # 记录开始时间
    start_time = time.time()
    
    try:
        if not args.stream:
            # 非流式响应
            completion = client.chat.completions.create(
                model=args.model,
                messages=messages,
                max_tokens=args.max_tokens,
                temperature=args.temperature,
                extra_headers=extra_headers
            )
            
            # 计算响应时间
            elapsed_time = time.time() - start_time
            print_info("\n响应时间", f"{elapsed_time:.2f}秒")
            
            # 根据模式显示不同详细程度的输出
            if args.mode == "debug":
                print_info("完整响应", "")
                print(json.dumps(completion.model_dump(), ensure_ascii=False, indent=2))
            
            print_header("回复内容")
            print(completion.choices[0].message.content)
            
        else:
            # 流式响应
            print_header("流式响应内容")
            content_buffer = []
            reasoning_buffer = []
            
            for chunk in client.chat.completions.create(
                model=args.model,
                messages=messages,
                max_tokens=args.max_tokens,
                temperature=args.temperature,
                stream=True,
                extra_headers=extra_headers
            ):
                # 处理内容和思考过程
                delta = chunk.choices[0].delta
                
                if hasattr(delta, 'content') and delta.content:
                    content_buffer.append(delta.content)
                    print(delta.content, end="", flush=True)
                
                # 有的模型可能支持reasoning_content
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    reasoning_buffer.append(delta.reasoning_content)
                    # 在debug模式下显示思考过程
                    if args.mode == "debug":
                        print(f"{colorize('[思考]', 'magenta')} {delta.reasoning_content}", end="", flush=True)
            
            # 打印完成信息
            elapsed_time = time.time() - start_time
            print(f"\n\n{colorize('响应时间:', 'green', True)} {elapsed_time:.2f}秒")
            
            # 在debug模式下保存完整内容
            if args.mode == "debug" and content_buffer:
                content = "".join(content_buffer)
                reasoning = "".join(reasoning_buffer)
                
                # 保存到文件
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                logs_dir = script_dir / "tests" / "logs"
                logs_dir.mkdir(exist_ok=True, parents=True)
                
                with open(f"{logs_dir}/response_{timestamp}.txt", "w", encoding="utf-8") as f:
                    f.write(f"===== 查询 =====\n{args.query}\n\n")
                    if reasoning:
                        f.write(f"===== 思考过程 =====\n{reasoning}\n\n")
                    f.write(f"===== 回复内容 =====\n{content}\n")
                
                print_info("完整响应已保存到", f"tests/logs/response_{timestamp}.txt")
            
        return True
            
    except Exception as e:
        print_error(f"{str(e)}")
        if args.mode == "debug":
            import traceback
            print(traceback.format_exc())
        return False

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='OpenRouter API 统一测试脚本')
    
    # 基本参数
    parser.add_argument('--query', '-q', type=str, default="你好，请用中文介绍一下自己。", 
                        help='要发送的查询内容')
    parser.add_argument('--model', '-m', type=str, default=os.getenv('OPENROUTER_MODEL_NAME', 'meta-llama/llama-3-8b-instruct'),
                        help='使用的模型名称')
    parser.add_argument('--system', '-S', type=str, default="你是一个有用的AI助手。请用中文回答问题。", 
                        help='系统提示消息')
    
    # 流式参数
    parser.add_argument('--stream', '-s', action='store_true', 
                        help='使用流式响应')
    
    # API设置
    parser.add_argument('--api-key', '-k', type=str,
                        help='OpenRouter API密钥 (默认从环境变量读取)')
    parser.add_argument('--base-url', '-u', type=str, default=os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
                        help='API基础URL')
    
    # 生成设置
    parser.add_argument('--max-tokens', '-t', type=int, default=500,
                        help='最大生成token数量')
    parser.add_argument('--temperature', '-T', type=float, default=0.7,
                        help='温度参数 (0-2之间)')
    
    # 请求头设置
    parser.add_argument('--referer', '-r', type=str, default="http://localhost:5173",
                        help='HTTP-Referer头部')
    parser.add_argument('--title', '-x', type=str, default="Mini-Chatbot-Test",
                        help='X-Title头部')
    
    # 其他设置
    parser.add_argument('--timeout', type=int, default=120,
                        help='请求超时时间(秒)')
    parser.add_argument('--mode', choices=['simple', 'normal', 'debug'], default='normal',
                        help='测试模式: simple=简洁输出, normal=标准输出, debug=详细输出')
    
    args = parser.parse_args()
    
    # 执行测试
    success = run_test(args)
    
    # 打印结果
    if success:
        print_success("测试成功完成!")
    else:
        print_error("测试失败!")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main()) 