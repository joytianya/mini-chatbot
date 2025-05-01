#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import sys
import os
import random
import dotenv
from dotenv import load_dotenv

# 加载环境变量
def load_env_vars():
    # 尝试加载环境变量，首先尝试当前目录下的.env，然后尝试server目录下的.env
    env_file_path = None
    if os.path.exists('.env'):
        load_dotenv('.env')
        env_file_path = '.env'
        print("已加载当前目录下的.env文件")
    elif os.path.exists('server/.env'):
        load_dotenv('server/.env')
        env_file_path = 'server/.env'
        print("已加载server目录下的.env文件")
    else:
        print("警告: 未找到.env文件，请创建.env文件并添加必要的环境变量")
        print("需要在以下位置创建.env文件: './server/.env' 或 './.env'")
        print("请在该文件中添加以下环境变量:")
        print("  OPENROUTER_API_KEY=你的API密钥")
        print("  OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free (可选，默认为此值)")
        print("  OPENROUTER_BASE_URL=https://openrouter.ai/api/v1 (可选，默认为此值)")
    
    # 检查必要的环境变量是否存在
    required_vars = {
        'OPENROUTER_MODEL': 'google/gemini-2.0-flash-exp:free',
        'OPENROUTER_BASE_URL': 'https://openrouter.ai/api/v1'
    }
    
    missing_vars = []
    if not os.getenv('OPENROUTER_API_KEY'):
        missing_vars.append('OPENROUTER_API_KEY')
    
    if missing_vars:
        print("警告: 以下必需的环境变量在.env文件中缺失:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\n请在.env文件中添加这些变量，例如:")
        print("OPENROUTER_API_KEY=你的API密钥")
        print("\n未提供API密钥将导致测试失败")

# 加载环境变量
load_env_vars()

# 确保输出编码为 UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# 从环境变量获取API密钥和模型
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'google/gemini-2.0-flash-exp:free')

# 确保Python使用UTF-8编码输出
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

# 从环境变量获取默认值
DEFAULT_BASE_URL = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')

# 检查API密钥是否存在，但不中断测试
if not OPENROUTER_API_KEY:
    print("警告: 缺少OPENROUTER_API_KEY环境变量。请在.env文件中添加此变量。")
    print("例如: OPENROUTER_API_KEY=你的API密钥")
    print("测试将无法进行，因为API密钥是必需的。")

def test_openrouter(prompt="请用中文介绍一下你自己", stream=False, api_key=None, base_url=None, model=None):
    # 使用参数提供的值或默认值
    api_key = api_key or OPENROUTER_API_KEY
    base_url = base_url or DEFAULT_BASE_URL
    model = model or OPENROUTER_MODEL
    
    # 如果没有提供API密钥，退出测试
    if not api_key:
        print("错误: 没有提供API密钥，无法进行测试")
        return None
    
    # 显示当前使用的参数（遮蔽API密钥的大部分）
    masked_key = api_key[:5] + "..." + api_key[-3:] if api_key and len(api_key) > 8 else "****"
    print(f"使用模型: {model}")
    print(f"基础URL: {base_url}")
    print(f"API密钥: {masked_key}")
    
    # 构建请求
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://mini-chatbot.example.com",
        "X-Title": "Mini-Chatbot Test"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "stream": stream
    }
    
    print(f"发送请求: {prompt[:50]}{'...' if len(prompt) > 50 else ''}")
    
    # 发送请求
    response = requests.post(
        f"{base_url}/chat/completions",
        headers=headers,
        json=payload,
        stream=stream
    )
    
    # 处理响应
    if response.status_code == 200:
        if stream:
            print("接收流式响应...")
            content = ""
            for chunk in response.iter_lines():
                if chunk:
                    chunk_str = chunk.decode('utf-8')
                    if chunk_str.startswith('data: '):
                        data_str = chunk_str[6:]  # 去掉 'data: ' 前缀
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and data["choices"] and "delta" in data["choices"][0]:
                                if "content" in data["choices"][0]["delta"]:
                                    content_chunk = data["choices"][0]["delta"]["content"]
                                    if content_chunk:
                                        content += content_chunk
                                        sys.stdout.write(content_chunk)
                                        sys.stdout.flush()
                        except json.JSONDecodeError:
                            print(f"无法解析JSON: {data_str}")
            print("\n\n完整响应:")
            print(content)
            return content
        else:
            response_data = response.json()
            content = response_data["choices"][0]["message"]["content"]
            print("\n响应内容:")
            print(content)
            return content
    else:
        print(f"请求失败: 状态码 {response.status_code}")
        print(response.text)
        return None

def main():
    # 检查API密钥是否存在
    if not OPENROUTER_API_KEY:
        print("错误: 缺少OPENROUTER_API_KEY环境变量。无法进行测试。")
        print("请在.env文件中添加此变量后重新运行测试。")
        sys.exit(1)
        
    # 测试两种模式
    test_openrouter("请用中文介绍一下你自己，不要太长", stream=False)
    print("\n---\n")
    test_openrouter("请用中文解释一下什么是量子计算", stream=True)

if __name__ == "__main__":
    main() 