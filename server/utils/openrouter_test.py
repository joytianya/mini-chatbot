#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
OpenRouter.ai API直接测试服务
从.env文件读取配置并发送请求
"""

import os
import json
import time
import requests
from typing import Dict, List, Any, Optional, Union
from dotenv import load_dotenv
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openrouter_test")

# 加载环境变量
load_dotenv()

class OpenRouterTest:
    """OpenRouter.ai API测试类"""
    
    def __init__(self):
        """初始化OpenRouter测试服务"""
        # 从.env加载配置
        self.api_key = os.getenv('OPENROUTER_API_KEY')
        self.base_url = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')
        self.model_name = os.getenv('OPENROUTER_MODEL_NAME', 'qwen/qwen3-1.7b')
        
        if not self.api_key:
            raise ValueError("缺少OPENROUTER_API_KEY环境变量")
        
        logger.info(f"OpenRouter配置 - 模型: {self.model_name}")
        
    def _prepare_headers(self, http_referer: str = "http://localhost:5173", title: str = "Mini-Chatbot-Test") -> Dict[str, str]:
        """准备请求头

        Args:
            http_referer: HTTP Referer头部
            title: X-Title头部

        Returns:
            包含必要头部的字典
        """
        return {
            "content-type": "application/json",
            "authorization": f"Bearer {self.api_key}",
            "http-referer": http_referer,
            "x-title": title
        }
    
    def chat_completion(self, 
                         messages: List[Dict[str, str]], 
                         temperature: float = 0.7,
                         max_tokens: int = 1000,
                         stream: bool = False) -> Dict[str, Any]:
        """发送聊天完成请求

        Args:
            messages: 聊天消息列表
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成的token数
            stream: 是否使用流式响应

        Returns:
            API响应
        """
        url = f"{self.base_url}/chat/completions"
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        headers = self._prepare_headers()
        
        logger.info(f"发送请求到 {url}")
        logger.info(f"请求头: {json.dumps(headers, ensure_ascii=False)}")
        logger.info(f"请求体: {json.dumps(payload, ensure_ascii=False)}")
        
        start_time = time.time()
        
        try:
            if not stream:
                response = requests.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                # 计算响应时间
                elapsed_time = time.time() - start_time
                logger.info(f"请求完成，用时: {elapsed_time:.2f}秒")
                
                return {
                    "success": True,
                    "data": data,
                    "elapsed_time": elapsed_time
                }
            else:
                # 流式响应处理
                response = requests.post(url, headers=headers, json=payload, stream=True)
                response.raise_for_status()
                
                content_chunks = []
                reasoning_chunks = []
                
                for line in response.iter_lines():
                    if line:
                        line_text = line.decode('utf-8')
                        if line_text.startswith('data: '):
                            if line_text == 'data: [DONE]':
                                break
                            
                            try:
                                data = json.loads(line_text[6:])  # 去掉'data: '前缀
                                delta = data['choices'][0]['delta']
                                
                                # 收集content和reasoning_content
                                if 'content' in delta and delta['content']:
                                    content_chunks.append(delta['content'])
                                
                                if 'reasoning_content' in delta and delta['reasoning_content']:
                                    reasoning_chunks.append(delta['reasoning_content'])
                                    
                                # 打印实时进度
                                logger.debug(f"收到流式数据: {line_text[:50]}...")
                            except json.JSONDecodeError:
                                logger.error(f"解析JSON失败: {line_text}")
                
                # 组合结果
                elapsed_time = time.time() - start_time
                content = "".join(content_chunks)
                reasoning = "".join(reasoning_chunks)
                
                logger.info(f"流式请求完成，用时: {elapsed_time:.2f}秒")
                logger.info(f"内容长度: {len(content)}, 思考过程长度: {len(reasoning)}")
                
                return {
                    "success": True,
                    "data": {
                        "content": content,
                        "reasoning": reasoning
                    },
                    "elapsed_time": elapsed_time
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"请求失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "elapsed_time": time.time() - start_time
            }
    
    def test_connection(self) -> Dict[str, Any]:
        """测试与OpenRouter的连接

        Returns:
            包含测试结果的字典
        """
        test_message = [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": "Hello, are you working?"}
        ]
        
        try:
            result = self.chat_completion(test_message, max_tokens=50)
            return {
                "success": result["success"],
                "message": "连接测试成功" if result["success"] else "连接测试失败",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"连接测试异常: {str(e)}")
            return {
                "success": False,
                "message": f"连接测试异常: {str(e)}",
                "error": str(e)
            }
    
    def test_chinese(self) -> Dict[str, Any]:
        """测试中文响应

        Returns:
            包含测试结果的字典
        """
        test_message = [
            {"role": "system", "content": "你是一个有用的AI助手，请用中文回答问题。"},
            {"role": "user", "content": "你好，请用中文介绍一下自己。"}
        ]
        
        try:
            result = self.chat_completion(test_message, temperature=0.7, max_tokens=200)
            return {
                "success": result["success"],
                "message": "中文测试成功" if result["success"] else "中文测试失败",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"中文测试异常: {str(e)}")
            return {
                "success": False,
                "message": f"中文测试异常: {str(e)}",
                "error": str(e)
            }
    
    def test_stream(self) -> Dict[str, Any]:
        """测试流式响应

        Returns:
            包含测试结果的字典
        """
        test_message = [
            {"role": "system", "content": "你是一个有用的AI助手。在回答时，先思考问题，在reasoning_content中写下思考过程，然后在content中给出正式回答。"},
            {"role": "user", "content": "请解释什么是大语言模型？"}
        ]
        
        try:
            result = self.chat_completion(test_message, temperature=0.7, max_tokens=500, stream=True)
            return {
                "success": result["success"],
                "message": "流式响应测试成功" if result["success"] else "流式响应测试失败",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"流式响应测试异常: {str(e)}")
            return {
                "success": False,
                "message": f"流式响应测试异常: {str(e)}",
                "error": str(e)
            }

# 命令行测试
if __name__ == "__main__":
    try:
        tester = OpenRouterTest()
        
        print("\n===== OpenRouter.ai API 连接测试 =====")
        connection_test = tester.test_connection()
        if connection_test["success"]:
            content = connection_test.get("data", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ 连接成功! 响应内容: {content}")
            print(f"   用时: {connection_test.get('elapsed_time', 0):.2f}秒")
        else:
            print(f"❌ 连接失败: {connection_test.get('message', '')}")
        
        print("\n===== 中文响应测试 =====")
        chinese_test = tester.test_chinese()
        if chinese_test["success"]:
            content = chinese_test.get("data", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ 中文测试成功! 响应内容: {content[:100]}...")
            print(f"   用时: {chinese_test.get('elapsed_time', 0):.2f}秒")
        else:
            print(f"❌ 中文测试失败: {chinese_test.get('message', '')}")
        
        print("\n===== 流式响应测试 =====")
        stream_test = tester.test_stream()
        if stream_test["success"]:
            content = stream_test.get("data", {}).get("content", "")
            reasoning = stream_test.get("data", {}).get("reasoning", "")
            print(f"✅ 流式响应测试成功!")
            print(f"   思考过程: {reasoning[:100]}...")
            print(f"   回答内容: {content[:100]}...")
            print(f"   用时: {stream_test.get('elapsed_time', 0):.2f}秒")
        else:
            print(f"❌ 流式响应测试失败: {stream_test.get('message', '')}")
            
    except Exception as e:
        print(f"测试过程中出现异常: {str(e)}") 
# -*- coding: utf-8 -*-

"""
OpenRouter.ai API直接测试服务
从.env文件读取配置并发送请求
"""

import os
import json
import time
import requests
from typing import Dict, List, Any, Optional, Union
from dotenv import load_dotenv
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openrouter_test")

# 加载环境变量
load_dotenv()

class OpenRouterTest:
    """OpenRouter.ai API测试类"""
    
    def __init__(self):
        """初始化OpenRouter测试服务"""
        # 从.env加载配置
        self.api_key = os.getenv('OPENROUTER_API_KEY')
        self.base_url = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')
        self.model_name = os.getenv('OPENROUTER_MODEL_NAME', 'qwen/qwen3-1.7b')
        
        if not self.api_key:
            raise ValueError("缺少OPENROUTER_API_KEY环境变量")
        
        logger.info(f"OpenRouter配置 - 模型: {self.model_name}")
        
    def _prepare_headers(self, http_referer: str = "http://localhost:5173", title: str = "Mini-Chatbot-Test") -> Dict[str, str]:
        """准备请求头

        Args:
            http_referer: HTTP Referer头部
            title: X-Title头部

        Returns:
            包含必要头部的字典
        """
        return {
            "content-type": "application/json",
            "authorization": f"Bearer {self.api_key}",
            "http-referer": http_referer,
            "x-title": title
        }
    
    def chat_completion(self, 
                         messages: List[Dict[str, str]], 
                         temperature: float = 0.7,
                         max_tokens: int = 1000,
                         stream: bool = False) -> Dict[str, Any]:
        """发送聊天完成请求

        Args:
            messages: 聊天消息列表
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成的token数
            stream: 是否使用流式响应

        Returns:
            API响应
        """
        url = f"{self.base_url}/chat/completions"
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        headers = self._prepare_headers()
        
        logger.info(f"发送请求到 {url}")
        logger.info(f"请求头: {json.dumps(headers, ensure_ascii=False)}")
        logger.info(f"请求体: {json.dumps(payload, ensure_ascii=False)}")
        
        start_time = time.time()
        
        try:
            if not stream:
                response = requests.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                # 计算响应时间
                elapsed_time = time.time() - start_time
                logger.info(f"请求完成，用时: {elapsed_time:.2f}秒")
                
                return {
                    "success": True,
                    "data": data,
                    "elapsed_time": elapsed_time
                }
            else:
                # 流式响应处理
                response = requests.post(url, headers=headers, json=payload, stream=True)
                response.raise_for_status()
                
                content_chunks = []
                reasoning_chunks = []
                
                for line in response.iter_lines():
                    if line:
                        line_text = line.decode('utf-8')
                        if line_text.startswith('data: '):
                            if line_text == 'data: [DONE]':
                                break
                            
                            try:
                                data = json.loads(line_text[6:])  # 去掉'data: '前缀
                                delta = data['choices'][0]['delta']
                                
                                # 收集content和reasoning_content
                                if 'content' in delta and delta['content']:
                                    content_chunks.append(delta['content'])
                                
                                if 'reasoning_content' in delta and delta['reasoning_content']:
                                    reasoning_chunks.append(delta['reasoning_content'])
                                    
                                # 打印实时进度
                                logger.debug(f"收到流式数据: {line_text[:50]}...")
                            except json.JSONDecodeError:
                                logger.error(f"解析JSON失败: {line_text}")
                
                # 组合结果
                elapsed_time = time.time() - start_time
                content = "".join(content_chunks)
                reasoning = "".join(reasoning_chunks)
                
                logger.info(f"流式请求完成，用时: {elapsed_time:.2f}秒")
                logger.info(f"内容长度: {len(content)}, 思考过程长度: {len(reasoning)}")
                
                return {
                    "success": True,
                    "data": {
                        "content": content,
                        "reasoning": reasoning
                    },
                    "elapsed_time": elapsed_time
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"请求失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "elapsed_time": time.time() - start_time
            }
    
    def test_connection(self) -> Dict[str, Any]:
        """测试与OpenRouter的连接

        Returns:
            包含测试结果的字典
        """
        test_message = [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": "Hello, are you working?"}
        ]
        
        try:
            result = self.chat_completion(test_message, max_tokens=50)
            return {
                "success": result["success"],
                "message": "连接测试成功" if result["success"] else "连接测试失败",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"连接测试异常: {str(e)}")
            return {
                "success": False,
                "message": f"连接测试异常: {str(e)}",
                "error": str(e)
            }
    
    def test_chinese(self) -> Dict[str, Any]:
        """测试中文响应

        Returns:
            包含测试结果的字典
        """
        test_message = [
            {"role": "system", "content": "你是一个有用的AI助手，请用中文回答问题。"},
            {"role": "user", "content": "你好，请用中文介绍一下自己。"}
        ]
        
        try:
            result = self.chat_completion(test_message, temperature=0.7, max_tokens=200)
            return {
                "success": result["success"],
                "message": "中文测试成功" if result["success"] else "中文测试失败",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"中文测试异常: {str(e)}")
            return {
                "success": False,
                "message": f"中文测试异常: {str(e)}",
                "error": str(e)
            }
    
    def test_stream(self) -> Dict[str, Any]:
        """测试流式响应

        Returns:
            包含测试结果的字典
        """
        test_message = [
            {"role": "system", "content": "你是一个有用的AI助手。在回答时，先思考问题，在reasoning_content中写下思考过程，然后在content中给出正式回答。"},
            {"role": "user", "content": "请解释什么是大语言模型？"}
        ]
        
        try:
            result = self.chat_completion(test_message, temperature=0.7, max_tokens=500, stream=True)
            return {
                "success": result["success"],
                "message": "流式响应测试成功" if result["success"] else "流式响应测试失败",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"流式响应测试异常: {str(e)}")
            return {
                "success": False,
                "message": f"流式响应测试异常: {str(e)}",
                "error": str(e)
            }

# 命令行测试
if __name__ == "__main__":
    try:
        tester = OpenRouterTest()
        
        print("\n===== OpenRouter.ai API 连接测试 =====")
        connection_test = tester.test_connection()
        if connection_test["success"]:
            content = connection_test.get("data", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ 连接成功! 响应内容: {content}")
            print(f"   用时: {connection_test.get('elapsed_time', 0):.2f}秒")
        else:
            print(f"❌ 连接失败: {connection_test.get('message', '')}")
        
        print("\n===== 中文响应测试 =====")
        chinese_test = tester.test_chinese()
        if chinese_test["success"]:
            content = chinese_test.get("data", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ 中文测试成功! 响应内容: {content[:100]}...")
            print(f"   用时: {chinese_test.get('elapsed_time', 0):.2f}秒")
        else:
            print(f"❌ 中文测试失败: {chinese_test.get('message', '')}")
        
        print("\n===== 流式响应测试 =====")
        stream_test = tester.test_stream()
        if stream_test["success"]:
            content = stream_test.get("data", {}).get("content", "")
            reasoning = stream_test.get("data", {}).get("reasoning", "")
            print(f"✅ 流式响应测试成功!")
            print(f"   思考过程: {reasoning[:100]}...")
            print(f"   回答内容: {content[:100]}...")
            print(f"   用时: {stream_test.get('elapsed_time', 0):.2f}秒")
        else:
            print(f"❌ 流式响应测试失败: {stream_test.get('message', '')}")
            
    except Exception as e:
        print(f"测试过程中出现异常: {str(e)}") 