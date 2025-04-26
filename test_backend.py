#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import sys
import time

# 确保 Python 使用 UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

# 后端服务器地址
base_url = "http://localhost:5001"  # 默认后端地址

# 定义测试结果常量
TEST_SUCCESS = "成功"
TEST_PARTIAL = "部分成功"
TEST_FAILURE = "失败"

def test_server_status():
    """测试1: 验证服务器状态"""
    print("\n=== 测试 1: 验证服务器状态 ===")
    test_endpoint = f"{base_url}/api/test"
    print(f"向 {test_endpoint} 发送 GET 请求...")

    try:
        response = requests.get(test_endpoint, timeout=5)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                print("响应内容:")
                print(json.dumps(response_data, ensure_ascii=False, indent=2))
                print("\n服务器状态测试成功! ✓")
                return TEST_SUCCESS
            except json.JSONDecodeError:
                print("响应不是有效的 JSON 格式")
                print(response.text[:500])
                print("\n服务器状态测试失败! ✗")
                return TEST_FAILURE
        else:
            print(f"错误: 状态码 {response.status_code}")
            print(response.text[:500])
            print("\n服务器状态测试失败! ✗")
            return TEST_FAILURE
    except Exception as e:
        print(f"错误: {str(e)}")
        print("\n服务器状态测试失败! ✗")
        return TEST_FAILURE

def test_utf8_encoding():
    """测试2: UTF-8 编码测试"""
    print("\n=== 测试 2: UTF-8 编码测试 ===")
    utf8_endpoint = f"{base_url}/api/test_utf8"
    print(f"向 {utf8_endpoint} 发送 GET 请求...")

    try:
        # GET 测试
        response = requests.get(utf8_endpoint, timeout=5)
        print(f"状态码: {response.status_code}")
        
        get_success = False
        if response.status_code == 200:
            try:
                response_data = response.json()
                print("响应内容:")
                print(json.dumps(response_data, ensure_ascii=False, indent=2))
                
                # 验证响应中包含正确的中文字符
                if "你好，世界" in response_data.get("chinese_text", ""):
                    print("\nUTF-8 编码 GET 测试成功! ✓")
                    get_success = True
                else:
                    print("\nUTF-8 编码 GET 测试失败 - 响应中缺少预期的中文字符! ✗")
            except json.JSONDecodeError:
                print("响应不是有效的 JSON 格式")
                print(response.text[:500])
                print("\nUTF-8 编码 GET 测试失败! ✗")
        else:
            print(f"错误: 状态码 {response.status_code}")
            print(response.text[:500])
            print("\nUTF-8 编码 GET 测试失败! ✗")
        
        # POST 测试
        print(f"\n向 {utf8_endpoint} 发送 POST 请求，包含中文数据...")
        post_data = {
            "name": "张三",
            "message": "这是一条测试消息！",
            "items": ["苹果", "香蕉", "橙子"],
            "numbers": [1, 2, 3]
        }
        response = requests.post(
            utf8_endpoint,
            headers={"Content-Type": "application/json"},
            json=post_data,
            timeout=5
        )
        print(f"状态码: {response.status_code}")
        
        post_success = False
        if response.status_code == 200:
            try:
                response_data = response.json()
                print("响应内容:")
                print(json.dumps(response_data, ensure_ascii=False, indent=2))
                
                # 验证响应中包含回显的请求数据
                echo_data = response_data.get("echo", {})
                if echo_data.get("name") == "张三" and "苹果" in echo_data.get("items", []):
                    print("\nUTF-8 编码 POST 测试成功! ✓")
                    post_success = True
                else:
                    print("\nUTF-8 编码 POST 测试失败 - 响应中缺少预期的回显数据! ✗")
            except json.JSONDecodeError:
                print("响应不是有效的 JSON 格式")
                print(response.text[:500])
                print("\nUTF-8 编码 POST 测试失败! ✗")
        else:
            print(f"错误: 状态码 {response.status_code}")
            print(response.text[:500])
            print("\nUTF-8 编码 POST 测试失败! ✗")

        # 综合结果
        if get_success and post_success:
            return TEST_SUCCESS
        elif get_success or post_success:
            return TEST_PARTIAL
        else:
            return TEST_FAILURE
    except Exception as e:
        print(f"错误: {str(e)}")
        print("\nUTF-8 编码测试失败! ✗")
        return TEST_FAILURE

def test_chat_api():
    """测试3: 验证聊天 API (OpenRouter)"""
    print("\n=== 测试 3: 验证聊天 API (OpenRouter) ===")
    chat_endpoint = f"{base_url}/api/chat"

    # 测试包含中文的消息
    test_payload = {
        "messages": [
            {"role": "system", "content": "你是一个有帮助的助手。"},
            {"role": "user", "content": "你好，请回复一些中文内容测试编码。"}
        ],
        "model": "google/gemini-2.0-flash-exp:free",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": "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",
        "stream": True
    }

    print(f"向 {chat_endpoint} 发送 POST 请求...")
    print(f"测试负载: {json.dumps(test_payload, ensure_ascii=False, indent=2)}")

    try:
        # 流式测试
        response = requests.post(
            chat_endpoint,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "HTTP-Referer": "https://mini-chatbot.example.com",
                "X-Title": "Mini-Chatbot Test"
            },
            json=test_payload,
            timeout=60,
            stream=True
        )

        print(f"\n状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("流式响应内容:")
            full_response = []
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    # 注释掉原始响应数据，减少输出混乱
                    # print(f"  {decoded_line}")
                    
                    if decoded_line.startswith("data: "):
                        # 解析数据
                        data_str = decoded_line[6:]  # 移除 "data: " 前缀
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                if "delta" in data["choices"][0]:
                                    delta = data["choices"][0]["delta"]
                                    if "content" in delta and delta["content"]:
                                        content = delta["content"]
                                        full_response.append(content)
                                        sys.stdout.write(content)
                                        sys.stdout.flush()
                        except json.JSONDecodeError:
                            print(f"无法解析 JSON 数据: {data_str}")
            
            print("\n\n完整响应:")
            print(''.join(full_response))
            
            if full_response:
                print("\n聊天API测试成功! ✓")
                return TEST_SUCCESS
            else:
                print("\n聊天API测试失败 - 未收到有效响应! ✗")
                return TEST_FAILURE
        else:
            print(f"错误: 请求失败，状态码 {response.status_code}")
            print("响应内容:")
            print(response.text[:500])  # 限制输出长度
            return TEST_FAILURE

    except requests.exceptions.ConnectionError:
        print(f"错误: 无法连接到后端服务器 {base_url}。")
        print("请确保服务器正在运行，并且可以从当前主机访问。")
        return TEST_FAILURE
    except requests.exceptions.Timeout:
        print("错误: 请求超时。后端服务可能处理缓慢或存在问题。")
        return TEST_FAILURE
    except Exception as e:
        print(f"错误: 测试过程中发生错误: {str(e)}")
        return TEST_FAILURE

def test_web_search():
    """测试4: 验证聊天 API 带有网络搜索功能"""
    print("\n=== 测试 4: 验证聊天 API 带有网络搜索功能 ===")
    chat_endpoint = f"{base_url}/api/chat"

    # 测试包含网络搜索的消息
    web_search_payload = {
        "messages": [
            {"role": "system", "content": "你是一个有帮助的助手。"},
            {"role": "user", "content": "2024年最新的AI技术有哪些？"}
        ],
        "model": "google/gemini-2.0-flash-exp:free",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": "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",
        "stream": True,
        "web_search": True  # 启用网络搜索功能
    }

    print(f"向 {chat_endpoint} 发送带网络搜索的 POST 请求...")
    print(f"测试负载: {json.dumps(web_search_payload, ensure_ascii=False, indent=2)}")

    try:
        # 流式测试
        response = requests.post(
            chat_endpoint,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "HTTP-Referer": "https://mini-chatbot.example.com",
                "X-Title": "Mini-Chatbot Test"
            },
            json=web_search_payload,
            timeout=120,  # 搜索可能需要更长时间
            stream=True
        )

        print(f"\n状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("流式响应内容:")
            full_response = []
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    # 注释掉原始响应数据，减少输出混乱
                    # print(f"  {decoded_line}")
                    
                    if decoded_line.startswith("data: "):
                        # 解析数据
                        data_str = decoded_line[6:]  # 移除 "data: " 前缀
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                if "delta" in data["choices"][0]:
                                    delta = data["choices"][0]["delta"]
                                    if "content" in delta and delta["content"]:
                                        content = delta["content"]
                                        full_response.append(content)
                                        sys.stdout.write(content)
                                        sys.stdout.flush()
                        except json.JSONDecodeError:
                            print(f"无法解析 JSON 数据: {data_str}")
            
            print("\n\n完整响应:")
            print(''.join(full_response))
            
            # 验证响应中是否包含"相关网页链接"
            response_text = ''.join(full_response)
            if "相关网页链接" in response_text:
                print("\n网络搜索功能测试成功! ✓")
                return TEST_SUCCESS
            elif full_response:
                print("\n网络搜索功能测试部分成功 - 响应中未发现明确的网络搜索结果标识，但收到了回复 ⚠️")
                return TEST_PARTIAL
            else:
                print("\n网络搜索功能测试失败 - 未收到有效响应 ✗")
                return TEST_FAILURE
        else:
            print(f"错误: 请求失败，状态码 {response.status_code}")
            print("响应内容:")
            print(response.text[:500])  # 限制输出长度
            return TEST_FAILURE

    except requests.exceptions.ConnectionError:
        print(f"错误: 无法连接到后端服务器 {base_url}。")
        print("请确保服务器正在运行，并且可以从当前主机访问。")
        return TEST_FAILURE
    except requests.exceptions.Timeout:
        print("错误: 请求超时。后端服务可能处理缓慢或存在问题。")
        return TEST_FAILURE
    except Exception as e:
        print(f"错误: 测试过程中发生错误: {str(e)}")
        return TEST_FAILURE

def test_doc_chat():
    """测试5: 验证文档聊天 API"""
    print("\n=== 测试 5: 验证文档聊天 API ===")
    doc_chat_endpoint = f"{base_url}/api/chat_with_doc"

    # 测试文档聊天
    doc_chat_payload = {
        "messages": [
            {"role": "system", "content": "你是一个有帮助的文档助手。"},
            {"role": "user", "content": "文档中有哪些主要内容？"}
        ],
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": "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",
        "model_name": "google/gemini-2.0-flash-exp:free",
        "embedding_base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "embedding_api_key": "1d9346d5-fb30-40af-9158-350f630645fc",
        "embedding_model_name": "ep-20250227223958-wb4sk",
        "document_ids": [],  # 可以指定文档ID，空数组表示搜索所有文档
        "stream": True,
        "web_search": False  # 可选择是否同时进行网络搜索
    }

    print(f"向 {doc_chat_endpoint} 发送 POST 请求...")
    print(f"测试负载: {json.dumps(doc_chat_payload, ensure_ascii=False, indent=2)}")

    try:
        # 流式测试
        response = requests.post(
            doc_chat_endpoint,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "HTTP-Referer": "https://mini-chatbot.example.com",
                "X-Title": "Mini-Chatbot Test"
            },
            json=doc_chat_payload,
            timeout=60,
            stream=True
        )

        print(f"\n状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("流式响应内容:")
            full_response = []
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    # 注释掉原始响应数据，减少输出混乱
                    # print(f"  {decoded_line}")
                    
                    if decoded_line.startswith("data: "):
                        # 解析数据
                        data_str = decoded_line[6:]  # 移除 "data: " 前缀
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                if "delta" in data["choices"][0]:
                                    delta = data["choices"][0]["delta"]
                                    # 优先展示思考过程
                                    if "reasoning_content" in delta and delta["reasoning_content"]:
                                        reasoning = delta["reasoning_content"]
                                        full_response.append(reasoning)
                                        sys.stdout.write(f"\n[思考过程] {reasoning}")
                                        sys.stdout.flush()
                                    # 展示回答内容
                                    if "content" in delta and delta["content"]:
                                        content = delta["content"]
                                        full_response.append(content)
                                        sys.stdout.write(content)
                                        sys.stdout.flush()
                        except json.JSONDecodeError:
                            print(f"无法解析 JSON 数据: {data_str}")
            
            print("\n\n完整响应:")
            print(''.join(full_response))
            
            # 简单验证响应内容
            if full_response:
                print("\n文档聊天API测试成功! ✓")
                return TEST_SUCCESS
            else:
                print("\n文档聊天API测试失败 - 未收到有效响应! ✗")
                return TEST_FAILURE
        else:
            print(f"错误: 请求失败，状态码 {response.status_code}")
            print("响应内容:")
            print(response.text[:500])  # 限制输出长度
            return TEST_FAILURE

    except requests.exceptions.ConnectionError:
        print(f"错误: 无法连接到后端服务器 {base_url}。")
        print("请确保服务器正在运行，并且可以从当前主机访问。")
        return TEST_FAILURE
    except requests.exceptions.Timeout:
        print("错误: 请求超时。后端服务可能处理缓慢或存在问题。")
        return TEST_FAILURE
    except Exception as e:
        print(f"错误: 测试过程中发生错误: {str(e)}")
        return TEST_FAILURE

def test_deep_research():
    """测试6: 验证聊天 API 的深度研究功能"""
    print("\n=== 测试 6: 验证聊天 API 的深度研究功能 ===")
    chat_endpoint = f"{base_url}/api/chat"

    # 测试深度研究模式
    deep_research_payload = {
        "messages": [
            {"role": "system", "content": "你是一个专业的研究助手。"},
            {"role": "user", "content": "请深入分析量子计算对密码学的影响。"}
        ],
        "model": "google/gemini-2.0-flash-exp:free",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": "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",
        "stream": True,
        "deep_research": True  # 启用深度研究模式
    }

    print(f"向 {chat_endpoint} 发送深度研究模式的 POST 请求...")
    print(f"测试负载: {json.dumps(deep_research_payload, ensure_ascii=False, indent=2)}")

    try:
        # 流式测试
        response = requests.post(
            chat_endpoint,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "HTTP-Referer": "https://mini-chatbot.example.com",
                "X-Title": "Mini-Chatbot Test"
            },
            json=deep_research_payload,
            timeout=120,  # 深度研究可能需要更长时间
            stream=True
        )

        print(f"\n状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("流式响应内容:")
            full_response = []
            reasoning_content = []
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    # 注释掉原始响应数据，减少输出混乱
                    # print(f"  {decoded_line}")
                    
                    if decoded_line.startswith("data: "):
                        # 解析数据
                        data_str = decoded_line[6:]  # 移除 "data: " 前缀
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                # 检查是否包含reasoning_content（深度研究的标志）
                                if "delta" in data["choices"][0] and "reasoning_content" in data["choices"][0]["delta"]:
                                    content = data["choices"][0]["delta"]["reasoning_content"]
                                    reasoning_content.append(content)
                                    sys.stdout.write(f"{content}")
                                    sys.stdout.flush()
                                # 常规内容
                                elif "delta" in data["choices"][0] and "content" in data["choices"][0]["delta"]:
                                    content = data["choices"][0]["delta"]["content"]
                                    full_response.append(content)
                                    sys.stdout.write(f"{content}")
                                    sys.stdout.flush()
                        except json.JSONDecodeError:
                            print(f"无法解析 JSON 数据: {data_str}")
            
            print("\n\n完整响应:")
            if reasoning_content:
                print("==== 推理过程内容 ====")
                print(''.join(reasoning_content))
                print("\n==== 最终回答内容 ====")
            print(''.join(full_response))
            
            # 验证深度研究功能
            if reasoning_content:
                print("\n深度研究功能测试成功! 检测到推理过程内容 ✓")
                return TEST_SUCCESS
            elif full_response:
                print("\n深度研究功能测试部分成功! 未检测到推理过程，但收到了回复内容 ⚠️")
                return TEST_PARTIAL
            else:
                print("\n深度研究功能测试失败! 未收到有效响应 ✗")
                return TEST_FAILURE
        else:
            print(f"错误: 请求失败，状态码 {response.status_code}")
            print("响应内容:")
            print(response.text[:500])  # 限制输出长度
            return TEST_FAILURE

    except requests.exceptions.ConnectionError:
        print(f"错误: 无法连接到后端服务器 {base_url}。")
        print("请确保服务器正在运行，并且可以从当前主机访问。")
        return TEST_FAILURE
    except requests.exceptions.Timeout:
        print("错误: 请求超时。后端服务可能处理缓慢或存在问题。")
        return TEST_FAILURE
    except Exception as e:
        print(f"错误: 测试过程中发生错误: {str(e)}")
        return TEST_FAILURE

def run_all_tests():
    """运行所有测试并统计结果"""
    print("开始执行全部测试...\n")
    
    # 定义测试函数列表
    tests = [
        {"name": "服务器状态测试", "func": test_server_status},
        {"name": "UTF-8编码测试", "func": test_utf8_encoding},
        {"name": "聊天API测试", "func": test_chat_api},
        {"name": "网络搜索功能测试", "func": test_web_search},
        {"name": "文档聊天API测试", "func": test_doc_chat},
        {"name": "深度研究功能测试", "func": test_deep_research}
    ]
    
    # 初始化结果计数
    results = {
        TEST_SUCCESS: [],
        TEST_PARTIAL: [],
        TEST_FAILURE: []
    }
    
    # 运行所有测试
    for test in tests:
        print(f"\n{'-'*80}")
        print(f"执行测试: {test['name']}")
        start_time = time.time()
        result = test["func"]()
        duration = time.time() - start_time
        
        # 记录结果
        results[result].append(test["name"])
        print(f"测试完成: {test['name']} - 结果: {result} (耗时: {duration:.2f}秒)")
    
    # 输出统计结果
    print(f"\n{'-'*80}")
    print("\n测试结果统计:")
    print(f"总测试数: {len(tests)}")
    print(f"成功: {len(results[TEST_SUCCESS])} 个")
    if results[TEST_SUCCESS]:
        print(f"  成功的测试: {', '.join(results[TEST_SUCCESS])}")
    
    print(f"部分成功: {len(results[TEST_PARTIAL])} 个")
    if results[TEST_PARTIAL]:
        print(f"  部分成功的测试: {', '.join(results[TEST_PARTIAL])}")
    
    print(f"失败: {len(results[TEST_FAILURE])} 个")
    if results[TEST_FAILURE]:
        print(f"  失败的测试: {', '.join(results[TEST_FAILURE])}")
    
    # 计算完成率
    success_count = len(results[TEST_SUCCESS])
    partial_count = len(results[TEST_PARTIAL])
    total_count = len(tests)
    
    # 部分成功计为0.5分
    completion_rate = (success_count + partial_count * 0.5) / total_count
    print(f"\n完成率: {completion_rate:.2%} ({success_count + partial_count * 0.5}/{total_count})")
    
    return completion_rate

if __name__ == "__main__":
    run_all_tests()
    print("\n测试完成。") 