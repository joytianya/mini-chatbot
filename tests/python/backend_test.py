#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Mini-Chatbot 后端测试脚本
用于测试后端服务的各项功能
"""

import os
import sys
import json
import time
import unittest
import requests
from pathlib import Path
from dotenv import load_dotenv

# 添加项目根目录到 Python 路径
script_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(script_dir))

# 导入其他测试模块
test_dir = Path(__file__).resolve().parent
sys.path.append(str(test_dir))

# 尝试导入searx_client_test模块
try:
    from searx_client_test import TestSearXClient, TestMultiSearXClient
    SEARX_TESTS_AVAILABLE = True
except ImportError:
    print("警告: 无法导入searx_client_test模块，将跳过相关测试")
    SEARX_TESTS_AVAILABLE = False

# 优先从项目根目录加载环境变量
root_env_path = script_dir / ".env"
server_env_path = script_dir / "server" / ".env"

if root_env_path.exists():
    load_dotenv(dotenv_path=root_env_path)
    print(f"已从 {root_env_path} 加载环境变量")
elif server_env_path.exists():
    load_dotenv(dotenv_path=server_env_path)
    print(f"已从 {server_env_path} 加载环境变量")
else:
    print(f"警告: 未找到环境变量文件")

# 配置信息
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5001")
API_SETTINGS = {
    "base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
    "api_key": os.getenv("OPENROUTER_API_KEY", ""),
    "model_name": os.getenv("OPENROUTER_MODEL_NAME", "meta-llama/llama-3-8b-instruct")
}

# ANSI 颜色代码
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(title):
    """打印格式化的标题"""
    width = 70
    print("\n" + "=" * width)
    print(f"{Colors.BOLD}{Colors.CYAN}{title.center(width)}{Colors.RESET}")
    print("=" * width + "\n")

def print_section(title):
    """打印小节标题"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}## {title}{Colors.RESET}")

def print_success(message):
    """打印成功消息"""
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")

def print_error(message):
    """打印错误消息"""
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")

def print_info(key, value):
    """打印信息键值对"""
    print(f"{Colors.BOLD}{Colors.BLUE}{key}:{Colors.RESET} {value}")

def print_json(data):
    """打印格式化的JSON数据"""
    print(json.dumps(data, ensure_ascii=False, indent=2))

class BackendTester:
    """后端测试器类"""
    
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.api_settings = API_SETTINGS
        self.results = {
            "服务器状态": None,
            "Chat API": None,
            "直接API": None,
            "联网搜索": None
        }
        
    def mask_api_key(self, key):
        """遮蔽API密钥，只显示前8位后跟..."""
        if not key:
            return "未设置"
        return key[:8] + "..."
    
    def print_config(self):
        """打印当前配置信息"""
        print_section("测试配置")
        print_info("后端URL", self.backend_url)
        print_info("API基础URL", self.api_settings["base_url"])
        print_info("API密钥", self.mask_api_key(self.api_settings["api_key"]))
        print_info("模型名称", self.api_settings["model_name"])
        print()
        
    def test_server_status(self):
        """测试服务器状态"""
        print_section("测试服务器状态")
        test_url = f"{self.backend_url}/api/test"
        print_info("请求URL", test_url)
        
        try:
            response = requests.get(test_url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print_success("服务器状态测试成功")
                api_version = data.get("version", "未知")
                print_info("API版本", api_version)
                print_json(data)
                self.results["服务器状态"] = True
                return True
            else:
                print_error(f"服务器状态测试失败: 状态码 {response.status_code}")
                print(response.text)
                self.results["服务器状态"] = False
                return False
        except Exception as e:
            print_error(f"服务器状态测试失败: {str(e)}")
            self.results["服务器状态"] = False
            return False
    
    def test_chat_api(self):
        """测试后端Chat API"""
        print_section("测试后端Chat API")
        chat_url = f"{self.backend_url}/api/chat"
        print_info("请求URL", chat_url)
        
        test_messages = [
            {"role": "system", "content": "你是一个有帮助的助手。请简短回复。"},
            {"role": "user", "content": "你好，请简短介绍自己。"}
        ]
        
        payload = {
            "messages": test_messages,
            "base_url": self.api_settings["base_url"],
            "api_key": self.api_settings["api_key"],
            "model_name": self.api_settings["model_name"],
            "web_search": False,
            "deep_research": False,
            "stream": False
        }
        
        masked_payload = {**payload, "api_key": self.mask_api_key(payload["api_key"])}
        print_info("请求体", "")
        print_json(masked_payload)
        
        try:
            response = requests.post(
                chat_url,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "HTTP-Referer": "http://localhost:5173/mini-chatbot/",
                    "X-Title": "Mini-Chatbot Python Test"
                },
                json=payload,
                timeout=60,
                proxies=None
            )
            
            print_info("响应状态码", response.status_code)
            
            if response.status_code == 200:
                data = response.json()
                print_success("后端Chat API测试成功")
                
                # 打印回复内容
                content = None
                if "choices" in data and len(data["choices"]) > 0:
                    if "message" in data["choices"][0]:
                        content = data["choices"][0]["message"].get("content", "")
                
                if content:
                    print_info("模型回复", "")
                    print(content)
                else:
                    print_info("模型回复", "无内容")
                
                self.results["Chat API"] = True
                return True
            else:
                print_error(f"后端Chat API测试失败: 状态码 {response.status_code}")
                print_json(response.json() if response.text else {})
                self.results["Chat API"] = False
                return False
        except Exception as e:
            print_error(f"后端Chat API测试失败: {str(e)}")
            self.results["Chat API"] = False
            return False
    
    def test_web_search(self):
        """测试联网搜索功能"""
        print_section("测试联网搜索功能")
        chat_url = f"{self.backend_url}/api/chat"
        print_info("请求URL", chat_url)
        
        # 使用需要最新信息的问题来测试联网搜索
        current_year = time.strftime("%Y")
        test_messages = [
            {"role": "system", "content": "你是一个有帮助的助手。请简短回复，确保引用你的信息来源。"},
            {"role": "user", "content": f"目前{current_year}年的世界人口大约是多少？请引用数据来源。"}
        ]
        
        payload = {
            "messages": test_messages,
            "base_url": self.api_settings["base_url"],
            "api_key": self.api_settings["api_key"],
            "model_name": self.api_settings["model_name"],
            "web_search": True,  # 启用联网搜索
            "deep_research": False,
            "stream": False
        }
        
        masked_payload = {**payload, "api_key": self.mask_api_key(payload["api_key"])}
        print_info("请求体", "")
        print_json(masked_payload)
        
        try:
            response = requests.post(
                chat_url,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "HTTP-Referer": "http://localhost:5173/mini-chatbot/",
                    "X-Title": "Mini-Chatbot Python Test"
                },
                json=payload,
                timeout=120,  # 联网搜索可能需要更长时间
                proxies=None
            )
            
            print_info("响应状态码", response.status_code)
            
            if response.status_code == 200:
                data = response.json()
                print_success("联网搜索测试成功")
                
                # 打印回复内容
                content = None
                if "choices" in data and len(data["choices"]) > 0:
                    if "message" in data["choices"][0]:
                        content = data["choices"][0]["message"].get("content", "")
                
                if content:
                    print_info("模型回复", "")
                    print(content)
                    
                    # 检查回复中是否包含引用或链接，这通常表示联网搜索正常工作
                    has_references = any(marker in content.lower() for marker in ['http', 'www', '来源', '引用', '参考', '数据显示'])
                    if has_references:
                        print_success("检测到回复中包含引用或来源信息，联网搜索功能正常")
                    else:
                        print_info("注意", "回复中未明确检测到引用信息，但联网搜索可能仍在工作")
                else:
                    print_info("模型回复", "无内容")
                
                # 检查回复中的元数据，看是否包含搜索结果
                web_search_results = data.get("web_search_results", [])
                if web_search_results:
                    print_success(f"检测到搜索结果: {len(web_search_results)} 条")
                    print_info("搜索结果示例", "")
                    # 修复：处理web_search_results可能是字符串的情况
                    if isinstance(web_search_results, list) and len(web_search_results) > 0:
                        for i, result in enumerate(web_search_results[:2]):  # 只显示前两条
                            if isinstance(result, dict):
                                print(f"{i+1}. {result.get('title', '无标题')} - {result.get('url', '无URL')}")
                            else:
                                print(f"{i+1}. {str(result)[:100]}...")  # 显示字符串的前100个字符
                    elif isinstance(web_search_results, str):
                        print(f"搜索结果为字符串: {web_search_results[:100]}...")  # 显示字符串的前100个字符
                
                self.results["联网搜索"] = True
                return True
            else:
                print_error(f"联网搜索测试失败: 状态码 {response.status_code}")
                print_json(response.json() if response.text else {})
                self.results["联网搜索"] = False
                return False
        except Exception as e:
            print_error(f"联网搜索测试失败: {str(e)}")
            self.results["联网搜索"] = False
            return False
    
    def test_direct_api(self):
        """测试直接API请求"""
        print_section("测试直接API请求")
        
        # 如果没有API密钥，跳过此测试
        if not self.api_settings["api_key"]:
            print_info("跳过测试", "未设置API密钥")
            self.results["直接API"] = None
            return None
        
        api_url = f"{self.api_settings['base_url']}/chat/completions"
        print_info("请求URL", api_url)
        
        test_messages = [
            {"role": "system", "content": "你是一个有帮助的助手。请简短回复。"},
            {"role": "user", "content": "你好，请用一句话介绍自己。"}
        ]
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_settings['api_key']}",
        }
        
        if "openrouter" in self.api_settings["base_url"]:
            headers["HTTP-Referer"] = "http://localhost:5173/mini-chatbot/"
            headers["X-Title"] = "Mini-Chatbot Python Test"
        
        payload = {
            "model": self.api_settings["model_name"],
            "messages": test_messages,
            "stream": False,
            "max_tokens": 150
        }
        
        print_info("请求头", list(headers.keys()))
        print_info("请求体", "")
        print_json({**payload, "api_key": "已隐藏"})
        
        try:
            response = requests.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=60,
                proxies=None
            )
            
            print_info("响应状态码", response.status_code)
            
            if response.status_code == 200:
                data = response.json()
                reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                print_success("直接API测试成功")
                print_info("API回复", "")
                print(reply)
                
                self.results["直接API"] = True
                return True
            else:
                print_error(f"直接API测试失败: 状态码 {response.status_code}")
                print(response.text)
                self.results["直接API"] = False
                return False
        except Exception as e:
            print_error(f"直接API测试失败: {str(e)}")
            self.results["直接API"] = False
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        print_header("Mini-Chatbot 后端测试")
        
        self.print_config()
        
        # 测试服务器状态
        server_status = self.test_server_status()
        print()
        
        # 如果服务器测试成功，继续测试API
        if server_status:
            # 测试后端Chat API
            chat_api = self.test_chat_api()
            print()
            
            # 测试联网搜索功能
            web_search = self.test_web_search()
            print()
            
            # 测试直接API请求
            direct_api = self.test_direct_api()
            print()
        else:
            print_error("服务器不可用，跳过API测试")
            self.results["Chat API"] = None
            self.results["直接API"] = None
            self.results["联网搜索"] = None
        
        # 打印测试结果摘要
        self.print_summary()
        
        # 返回测试是否全部成功
        return all(result is True for result in self.results.values() if result is not None)
    
    def print_summary(self):
        """打印测试结果摘要"""
        print_header("测试结果摘要")
        
        for test_name, result in self.results.items():
            if result is True:
                print(f"{Colors.GREEN}✓ {test_name}测试成功{Colors.RESET}")
            elif result is False:
                print(f"{Colors.RED}✗ {test_name}测试失败{Colors.RESET}")
            elif result is None:
                print(f"{Colors.YELLOW}- {test_name}测试已跳过{Colors.RESET}")
        
        # 统计结果
        success_count = sum(1 for result in self.results.values() if result is True)
        fail_count = sum(1 for result in self.results.values() if result is False)
        skip_count = sum(1 for result in self.results.values() if result is None)
        
        print(f"\n总测试数: {len(self.results)}")
        print(f"成功: {success_count}")
        print(f"失败: {fail_count}")
        print(f"跳过: {skip_count}")
        
        print()
        if fail_count == 0:
            if skip_count > 0:
                print(f"{Colors.YELLOW}部分测试已跳过，但所有执行的测试均已通过。{Colors.RESET}")
            else:
                print(f"{Colors.GREEN}所有测试均已通过!{Colors.RESET}")
        else:
            print(f"{Colors.YELLOW}部分测试未通过，请检查日志获取详细信息。{Colors.RESET}")

def main():
    """主函数"""
    # 运行后端API测试
    print_header("运行后端API测试")
    tester = BackendTester()
    api_test_success = tester.run_all_tests()
    
    # 运行SearX客户端测试
    searx_test_success = True
    if SEARX_TESTS_AVAILABLE:
        print_header("运行SearX客户端测试")
        try:
            # 创建测试套件
            suite = unittest.TestSuite()
            
            # 添加SearX客户端测试
            suite.addTest(unittest.makeSuite(TestSearXClient))
            suite.addTest(unittest.makeSuite(TestMultiSearXClient))
            
            # 运行测试
            runner = unittest.TextTestRunner(verbosity=2)
            result = runner.run(suite)
            
            # 检查测试结果
            searx_test_success = result.wasSuccessful()
            if searx_test_success:
                print_success("SearX客户端测试全部通过")
            else:
                print_error("SearX客户端测试存在失败项")
                
        except Exception as e:
            print_error(f"运行SearX客户端测试时出错: {e}")
            searx_test_success = False
    else:
        print_info("SearX客户端测试", "已跳过 (模块不可用)")
    
    # 返回整体测试结果
    return 0 if (api_test_success and searx_test_success) else 1

if __name__ == "__main__":
    sys.exit(main()) 