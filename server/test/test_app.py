import requests
import json

# 后端服务器地址 (使用开发环境地址)
base_url = "http://localhost:5001"
chat_endpoint = f"{base_url}/api/chat"

# 简单的测试消息
test_payload = {
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, backend!"}
    ],
    "model": "test-model", # 使用一个虚拟的模型名称或根据后端需要调整
    "stream": False # 通常测试时关闭流式传输以便获取完整响应
    # 根据后端 /api/chat 的实际需求添加其他必要字段
    # 例如: base_url, api_key, model_name, session_hash 等
    # "base_url": "...",
    # "api_key": "...",
    # "model_name": "...",
    # "session_hash": "test-session-123"
}

print(f"向 {chat_endpoint} 发送 POST 请求...")
print(f"Payload: {json.dumps(test_payload, indent=2)}")

try:
    response = requests.post(
        chat_endpoint,
        headers={"Content-Type": "application/json"},
        json=test_payload,
        timeout=30 # 设置超时时间
    )

    print(f"\n状态码: {response.status_code}")

    # 检查响应状态码
    if response.status_code == 200:
        print("请求成功!")
        try:
            # 尝试解析 JSON 响应
            response_data = response.json()
            print("响应内容 (JSON):")
            print(json.dumps(response_data, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            # 如果不是 JSON，打印原始文本
            print("响应内容 (Text):")
            print(response.text)
    elif response.status_code == 404:
        print("错误: 端点未找到 (404)。请确认 '/api/chat' 路由在后端已正确定义。")
    elif response.status_code == 422:
         print("错误: 请求体验证失败 (422)。请检查发送的 payload 是否符合后端要求。")
         try:
             print("详细错误信息:")
             print(json.dumps(response.json(), indent=2, ensure_ascii=False))
         except json.JSONDecodeError:
             print(response.text)
    else:
        print(f"错误: 请求失败，状态码 {response.status_code}")
        print("响应内容:")
        print(response.text)

except requests.exceptions.ConnectionError:
    print(f"错误: 无法连接到后端服务器 {base_url}。请确保后端服务正在运行。")
except requests.exceptions.Timeout:
    print("错误: 请求超时。")
except requests.exceptions.RequestException as e:
    print(f"错误: 请求过程中发生错误: {e}")
