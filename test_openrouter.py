#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import sys
import time
import argparse

# 确保 Python 使用 UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

def test_openrouter(api_key, base_url, model, prompt, stream=True):
    """测试 OpenRouter API 连接"""
    print(f"=== 测试 OpenRouter API 连接 ===")
    print(f"基础 URL: {base_url}")
    print(f"模型: {model}")
    print(f"流式响应: {stream}")
    print(f"提示: {prompt}")
    
    # 后端服务器地址
    server_url = "http://localhost:5001"
    endpoint = f"{server_url}/api/test_openrouter"
    
    # 请求数据
    payload = {
        "api_key": api_key,
        "base_url": base_url,
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "stream": stream
    }
    
    # 发送请求
    try:
        print("\n发送请求中...")
        start_time = time.time()
        
        if stream:
            # 使用流式响应
            response = requests.post(
                endpoint,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream"
                },
                stream=True,
                timeout=60
            )
            
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                print("\n流式响应内容:")
                full_response = []
                
                for line in response.iter_lines():
                    if line:
                        decoded_line = line.decode('utf-8')
                        print(f"  {decoded_line}")
                        
                        if decoded_line.startswith("data: "):
                            # 解析数据
                            data_str = decoded_line[6:]  # 移除 "data: " 前缀
                            if data_str == "[DONE]":
                                break
                            
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    if "delta" in data["choices"][0] and "content" in data["choices"][0]["delta"]:
                                        content = data["choices"][0]["delta"]["content"]
                                        full_response.append(content)
                                        sys.stdout.write(content)
                                        sys.stdout.flush()
                            except json.JSONDecodeError:
                                print(f"无法解析 JSON 数据: {data_str}")
                
                print("\n\n完整响应:")
                print(''.join(full_response))
            else:
                print(f"错误: {response.text}")
        else:
            # 使用普通响应
            response = requests.post(
                endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                print("\n响应内容:")
                print(json.dumps(response_data, ensure_ascii=False, indent=2))
                
                if "content" in response_data:
                    print("\n模型输出:")
                    print(response_data["content"])
            else:
                print(f"错误: {response.text}")
        
        # 计算响应时间
        elapsed_time = time.time() - start_time
        print(f"\n响应时间: {elapsed_time:.2f} 秒")
        
    except requests.exceptions.ConnectionError:
        print(f"错误: 无法连接到后端服务器 {server_url}")
        print("请确保服务器正在运行，并且可以从当前主机访问。")
    except requests.exceptions.Timeout:
        print("错误: 请求超时。OpenRouter 或后端服务可能处理缓慢。")
    except Exception as e:
        print(f"错误: 测试过程中发生错误: {str(e)}")
    
    print("\n测试完成。")

if __name__ == "__main__":
    # 命令行参数解析
    parser = argparse.ArgumentParser(description='测试 OpenRouter API 连接')
    parser.add_argument('--api-key', required=True, help='OpenRouter API 密钥')
    parser.add_argument('--base-url', default='https://openrouter.ai/api/v1', help='基础 URL')
    parser.add_argument('--model', default='google/gemini-2.0-flash-exp:free', help='模型名称')
    parser.add_argument('--prompt', default='你好，请用中文回答：什么是人工智能？', help='测试提示')
    parser.add_argument('--no-stream', action='store_true', help='使用非流式响应')
    
    args = parser.parse_args()
    
    # 运行测试
    test_openrouter(
        api_key=args.api_key,
        base_url=args.base_url,
        model=args.model,
        prompt=args.prompt,
        stream=not args.no_stream
    ) 