import requests
import json
import os
from dotenv import load_dotenv
import time

# 加载环境变量
load_dotenv()

# 服务器配置
BASE_URL = 'http://127.0.0.1:5001'
#BASE_URL = 'http://192.168.1.11:5001'

def test_upload_document():
    """测试文档上传功能"""
    print("\n1. 测试文档上传...")
    
    # 确保目录存在
    if not os.path.exists('documents'):
        os.makedirs('documents')
    
    # 创建测试文档
    with open('documents/test.txt', 'w', encoding='utf-8') as f:
        f.write("""这是一个测试文档。
用于测试RAG系统的功能。
包含一些简单的信息：
1. Python是一种编程语言
2. Flask是一个Web框架
3. RAG是检索增强生成的缩写""")
    
    # 上传文档
    try:
        with open('documents/test.txt', 'rb') as f:
            files = {'documents': ('test.txt', f, 'text/plain')}
            response = requests.post(f'{BASE_URL}/upload', files=files)
            print(f"上传响应状态码: {response.status_code}")
            try:
                print(f"上传响应内容: {response.json()}")
            except:
                print(f"上传响应内容: {response.text}")
    except Exception as e:
        print(f"上传请求失败: {str(e)}")
        return False
    
    return response.status_code == 200

def test_chat_endpoint():
    """测试聊天接口"""
    print("\n2. 测试聊天接口...")
    
    # 测试问题
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "这个文档里说了什么？"}
    ]
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
    }
    
    response = requests.post(
        f'{BASE_URL}/api/chat',
        json={
            "messages": messages,
            "model": "deepseek-v3-241226"
        },
        headers=headers,
        stream=True
    )
    
    print("聊天响应:")
    try:
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]
                    if data == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data)
                        if 'choices' in chunk:
                            delta = chunk['choices'][0].get('delta', {})
                            if 'reasoning_content' in delta:
                                print(delta['reasoning_content'], end='', flush=True)
                            elif 'content' in delta:
                                print(delta['content'], end='', flush=True)
                    except json.JSONDecodeError as e:
                        if data != '[DONE]':
                            print(f"\n无法解析JSON: {data}\n错误: {e}")
    except Exception as e:
        print(f"\n处理响应流时出错: {str(e)}")
        return False
    
    print("\n--- 响应结束 ---")
    return response.status_code == 200

def test_reasoning_capability():
    """测试推理能力"""
    print("\n3. 测试推理能力...")
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "解释一下RAG是什么？"}
    ]
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
    }
    
    response = requests.post(
        f'{BASE_URL}/api/chat',
        json={
            "messages": messages,
            "model": "deepseek-r1-250120"
        },
        headers=headers,
        stream=True
    )
    
    print("推理响应:")
    try:
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]
                    if data == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data)
                        if 'choices' in chunk:
                            delta = chunk['choices'][0].get('delta', {})
                            if 'reasoning_content' in delta:
                                print(delta['reasoning_content'], end='', flush=True)
                            elif 'content' in delta:
                                print(delta['content'], end='', flush=True)
                    except json.JSONDecodeError as e:
                        if data != '[DONE]':
                            print(f"\n无法解析JSON: {data}\n错误: {e}")
    except Exception as e:
        print(f"\n处理响应流时出错: {str(e)}")
        return False
    
    print("\n--- 响应结束 ---")
    return response.status_code == 200

def wait_for_server(max_retries=5, delay=2):
    """等待服务器启动"""
    for i in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/api/test")
            if response.status_code == 200:
                return True
            print(f"尝试 {i+1}/{max_retries}: 服务器返回状态码 {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"尝试 {i+1}/{max_retries}: 服务器未响应")
        time.sleep(delay)
    return False

def main():
    """运行所有测试"""
    print("开始测试 Flask 服务器...")
    
    if not wait_for_server():
        print("错误: 无法连接到服务器，请检查服务器是否正在运行")
        return
    
    try:
        # 测试服务器是否运行
        response = requests.get(f"{BASE_URL}/api/test")
        if response.status_code != 200:
            print(f"错误: 服务器返回状态码 {response.status_code}")
            return
        
        try:
            status = response.json()
            print(f"服务器状态: {status}")
        except json.JSONDecodeError as e:
            print(f"错误: 无法解析服务器响应: {response.text}")
            return
        
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到服务器。请确保 Flask 服务器正在运行。")
        return
    except Exception as e:
        print(f"错误: {str(e)}")
        return
    
    # 运行测试
    tests = [
        test_upload_document,
        #test_chat_endpoint,
        #test_reasoning_capability
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append((test.__name__, result))
        except Exception as e:
            print(f"测试 {test.__name__} 失败: {str(e)}")
            results.append((test.__name__, False))
    
    # 打印测试结果
    print("\n测试结果汇总:")
    for name, result in results:
        print(f"{name}: {'通过' if result else '失败'}")

if __name__ == '__main__':
    main() 