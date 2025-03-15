import json
import time
import requests
from typing import List, Dict, Generator, Any
from dataclasses import dataclass

@dataclass
class Delta:
    content: str = None
    reasoning_content: str = None

@dataclass
class Choice:
    delta: Delta

@dataclass
class ChatChunk:
    choices: List[Choice]

class JinaChatAPI:
    def __init__(self):
        self.messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": "你是mini-deepresearch助手，是由研发人员开发的"
            }
        ]
        self.base_url = "https://deepsearch.jina.ai/v1/chat/completions"
        self.request_count = 0
        self.last_request_time = 0
        
        # 浏览器请求头
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Origin": "https://search.jina.ai",
            "Referer": "https://search.jina.ai/",
            "Accept": "text/event-stream"
        }

    def _check_rate_limit(self) -> bool:
        """检查请求频率限制"""
        now = time.time()
        if now - self.last_request_time < 60:  # 1分钟内
            if self.request_count >= 30:
                return False
        else:
            # 重置计数器
            self.request_count = 0
            self.last_request_time = now
        return True

    def _process_stream_response(self, response: requests.Response) -> Generator[ChatChunk, None, None]:
        """处理流式响应的内部方法"""
        assistant_message = ""
        buffer = ""

        for chunk in response.iter_lines():
            if chunk:
                line = chunk.decode()
                if line.startswith('data: '):
                    try:
                        data = line[6:].strip()
                        if data == '[DONE]':
                            continue

                        json_data = json.loads(data)
                        delta = json_data['choices'][0].get('delta', {})
                        
                        # 检查是否是思考内容
                        if delta.get('type') == 'think':
                            content = delta.get('content', '')
                            content = content.replace("<think>", "").replace("</think>", "")
                            if content:
                                yield ChatChunk(choices=[
                                    Choice(delta=Delta(reasoning_content=content))
                                ])
                        # 普通内容
                        elif 'content' in delta:
                            content = delta['content']
                            content = content.replace("<think>", "").replace("</think>", "")
                            if content:
                                assistant_message += content
                                yield ChatChunk(choices=[
                                    Choice(delta=Delta(content=content))
                                ])
                    except json.JSONDecodeError:
                        continue

        # 保存助手回复到历史
        if assistant_message:
            self.messages.append({
                "role": "assistant",
                "content": assistant_message
            })

    def send_message(self, content: str) -> Generator[ChatChunk, None, None]:
        """
        发送单条消息并获取流式响应
        
        Args:
            content: 用户消息内容
            
        Yields:
            ChatChunk对象, 可以直接访问 chunk.choices[0].delta.content 或 
            chunk.choices[0].delta.reasoning_content
        """
        if not self._check_rate_limit():
            raise Exception("已达到免费用户限制(3次/分钟),请稍后再试")

        # 添加用户消息到历史
        self.messages.append({
            "role": "user",
            "content": content
        })

        try:
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json={
                    "messages": self.messages,
                    "stream": True,
                    "reasoning_effort": "medium"
                },
                stream=True  # 启用流式传输
            )

            if response.status_code != 200:
                if response.status_code == 429:
                    raise Exception("请求过于频繁,请稍后再试")
                error_text = response.text
                raise Exception(f"请求失败: {error_text}")

            self.request_count += 1
            yield from self._process_stream_response(response)

        except Exception as e:
            raise Exception(f"发送消息失败: {str(e)}")

    def stream_chat(self, messages: List[Dict[str, str]]) -> Generator[ChatChunk, None, None]:
        """
        使用指定的消息列表进行对话，获取流式响应
        
        Args:
            messages: 消息列表，每条消息格式为 {"role": "user"|"assistant"|"system", "content": "消息内容"}
            
        Yields:
            ChatChunk对象, 可以直接访问:
            - chunk.choices[0].delta.content: 普通回复内容
            - chunk.choices[0].delta.reasoning_content: 思考内容
        """
        if not self._check_rate_limit():
            raise Exception("已达到免费用户限制(3次/分钟),请稍后再试")

        # 直接在最前面添加我们的system消息
        messages = [
            {
                "role": "system",
                "content": "你是mini-deepresearch助手，是由研发人员开发的，没有实体和公司"
            }
        ] + messages
        try:
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json={
                    "messages": messages,
                    "stream": True,
                    "reasoning_effort": "medium"
                },
                stream=True
            )

            if response.status_code != 200:
                if response.status_code == 429:
                    raise Exception("请求过于频繁,请稍后再试")
                error_text = response.text
                raise Exception(f"请求失败: {error_text}")

            self.request_count += 1
            self.messages = messages.copy()  # 更新历史消息
            yield from self._process_stream_response(response)

        except Exception as e:
            raise Exception(f"发送消息失败: {str(e)}")

    def get_history(self) -> List[Dict[str, str]]:
        """获取对话历史"""
        return self.messages

    def clear_history(self) -> None:
        """清空对话历史"""
        self.messages = [
            {
                "role": "system",
                "content": "你是mini-deepresearch助手，是由研发人员开发的，没有实体和公司"
            }
        ]
        self.request_count = 0
        self.last_request_time = 0

    def get_remaining_requests(self) -> int:
        """获取剩余可用请求次数"""
        now = time.time()
        if now - self.last_request_time >= 60:
            return 3
        return max(0, 3 - self.request_count)

def demo():
    """使用示例"""
    chat = JinaChatAPI()
    
    try:
        print(f"剩余请求次数: {chat.get_remaining_requests()}")
        
        # 示例1: 使用send_message
        print("\n示例1 - 单条消息:")
        print("发送消息: 你好,请介绍一下自己")
        for chunk in chat.send_message("你好,北京天气"):
            if chunk.choices[0].delta.reasoning_content:
                content = chunk.choices[0].delta.reasoning_content
                print(content, end="", flush=True)
            elif chunk.choices[0].delta.content:
                print(chunk.choices[0].delta.content, end="", flush=True)
            
        # 示例2: 使用stream_chat
        print("\n\n示例2 - 消息列表:")
        messages = [
            {"role": "user", "content": "你好"},
            {"role": "assistant", "content": "我是王大大"},
            {"role": "user", "content": "你是谁"}
        ]
        print("发送消息列表...")
        for chunk in chat.stream_chat(messages):
            if chunk.choices[0].delta.reasoning_content:
                content = chunk.choices[0].delta.reasoning_content
                print(content, end="", flush=True)
            elif chunk.choices[0].delta.content:
                print(chunk.choices[0].delta.content, end="", flush=True)
        
        print(f"\n\n剩余请求次数: {chat.get_remaining_requests()}")
        print("\n对话历史:", chat.get_history())
        
    except Exception as e:
        print(f"\n运行出错: {e}")

if __name__ == "__main__":
    demo() 