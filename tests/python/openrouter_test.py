#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
OpenRouter.ai API direct test service
Load configuration from .env file and send requests
"""

import os
import json
import time
import requests
from typing import Dict, List, Any, Optional, Union
from dotenv import load_dotenv
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openrouter_test")

# Load environment variables
# Try loading from multiple locations
script_dir = Path(__file__).resolve().parent.parent
server_env_path = script_dir.parent / "server" / ".env"
root_env_path = script_dir.parent / ".env"

if server_env_path.exists():
    load_dotenv(dotenv_path=server_env_path)
    logger.info(f"Loaded environment from {server_env_path}")
elif root_env_path.exists():
    load_dotenv(dotenv_path=root_env_path)
    logger.info(f"Loaded environment from {root_env_path}")
else:
    logger.warning("No .env file found, using system environment variables")

class OpenRouterTest:
    """OpenRouter.ai API test class"""
    
    def __init__(self):
        """Initialize OpenRouter test service"""
        # Load config from .env
        self.api_key = os.getenv('OPENROUTER_API_KEY')
        self.base_url = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')
        self.model_name = os.getenv('OPENROUTER_MODEL_NAME', 'qwen/qwen3-1.7b')
        
        if not self.api_key:
            raise ValueError("Missing OPENROUTER_API_KEY environment variable")
        
        logger.info(f"OpenRouter config - Model: {self.model_name}")
        
    def _prepare_headers(self, http_referer: str = "http://localhost:5173", title: str = "Mini-Chatbot-Test") -> Dict[str, str]:
        """Prepare request headers

        Args:
            http_referer: HTTP Referer header
            title: X-Title header

        Returns:
            Dictionary containing necessary headers
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
        """Send chat completion request

        Args:
            messages: List of chat messages
            temperature: Temperature parameter, controls randomness
            max_tokens: Maximum number of tokens to generate
            stream: Whether to use streaming response

        Returns:
            API response
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
        
        logger.info(f"Sending request to {url}")
        logger.info(f"Headers: {json.dumps(headers)}")
        logger.info(f"Payload: {json.dumps(payload)}")
        
        start_time = time.time()
        
        try:
            if not stream:
                response = requests.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                # Calculate response time
                elapsed_time = time.time() - start_time
                logger.info(f"Request completed, time: {elapsed_time:.2f} seconds")
                
                return {
                    "success": True,
                    "data": data,
                    "elapsed_time": elapsed_time
                }
            else:
                # Stream response handling
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
                                data = json.loads(line_text[6:])  # Remove 'data: ' prefix
                                delta = data['choices'][0]['delta']
                                
                                # Collect content and reasoning_content
                                if 'content' in delta and delta['content']:
                                    content_chunks.append(delta['content'])
                                
                                if 'reasoning_content' in delta and delta['reasoning_content']:
                                    reasoning_chunks.append(delta['reasoning_content'])
                                    
                                # Print real-time progress
                                logger.debug(f"Received stream data: {line_text[:50]}...")
                            except json.JSONDecodeError:
                                logger.error(f"JSON parse failed: {line_text}")
                
                # Combine results
                elapsed_time = time.time() - start_time
                content = "".join(content_chunks)
                reasoning = "".join(reasoning_chunks)
                
                logger.info(f"Stream request completed, time: {elapsed_time:.2f} seconds")
                logger.info(f"Content length: {len(content)}, Reasoning length: {len(reasoning)}")
                
                return {
                    "success": True,
                    "data": {
                        "content": content,
                        "reasoning": reasoning
                    },
                    "elapsed_time": elapsed_time
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "elapsed_time": time.time() - start_time
            }
    
    def test_connection(self) -> Dict[str, Any]:
        """Test connection to OpenRouter

        Returns:
            Dictionary containing test results
        """
        test_message = [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": "Hello, are you working?"}
        ]
        
        try:
            result = self.chat_completion(test_message, max_tokens=50)
            return {
                "success": result["success"],
                "message": "Connection test successful" if result["success"] else "Connection test failed",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"Connection test exception: {str(e)}")
            return {
                "success": False,
                "message": f"Connection test exception: {str(e)}",
                "error": str(e)
            }
    
    def test_chinese(self) -> Dict[str, Any]:
        """Test Chinese response

        Returns:
            Dictionary containing test results
        """
        test_message = [
            {"role": "system", "content": "You are a helpful AI assistant. Please answer in Chinese."},
            {"role": "user", "content": "Hello, please introduce yourself in Chinese."}
        ]
        
        try:
            result = self.chat_completion(test_message, temperature=0.7, max_tokens=200)
            return {
                "success": result["success"],
                "message": "Chinese test successful" if result["success"] else "Chinese test failed",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"Chinese test exception: {str(e)}")
            return {
                "success": False,
                "message": f"Chinese test exception: {str(e)}",
                "error": str(e)
            }
    
    def test_stream(self) -> Dict[str, Any]:
        """Test streaming response

        Returns:
            Dictionary containing test results
        """
        test_message = [
            {"role": "system", "content": "You are a helpful AI assistant. When answering, first think about the question in reasoning_content, then provide a formal answer in content."},
            {"role": "user", "content": "Please explain what a large language model is."}
        ]
        
        try:
            result = self.chat_completion(test_message, temperature=0.7, max_tokens=500, stream=True)
            return {
                "success": result["success"],
                "message": "Stream response test successful" if result["success"] else "Stream response test failed",
                "data": result.get("data", {}),
                "elapsed_time": result.get("elapsed_time", 0)
            }
        except Exception as e:
            logger.error(f"Stream response test exception: {str(e)}")
            return {
                "success": False,
                "message": f"Stream response test exception: {str(e)}",
                "error": str(e)
            }

# Command line test
if __name__ == "__main__":
    try:
        tester = OpenRouterTest()
        
        print("\n===== OpenRouter.ai API Connection Test =====")
        connection_test = tester.test_connection()
        if connection_test["success"]:
            content = connection_test.get("data", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✓ Connection successful! Response: {content}")
            print(f"   Time: {connection_test.get('elapsed_time', 0):.2f} seconds")
        else:
            print(f"✗ Connection failed: {connection_test.get('message', '')}")
        
        print("\n===== Chinese Response Test =====")
        chinese_test = tester.test_chinese()
        if chinese_test["success"]:
            content = chinese_test.get("data", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✓ Chinese test successful! Response: {content[:100]}...")
            print(f"   Time: {chinese_test.get('elapsed_time', 0):.2f} seconds")
        else:
            print(f"✗ Chinese test failed: {chinese_test.get('message', '')}")
        
        print("\n===== Stream Response Test =====")
        stream_test = tester.test_stream()
        if stream_test["success"]:
            content = stream_test.get("data", {}).get("content", "")
            reasoning = stream_test.get("data", {}).get("reasoning", "")
            print(f"✓ Stream response test successful!")
            print(f"   Reasoning: {reasoning[:100]}...")
            print(f"   Content: {content[:100]}...")
            print(f"   Time: {stream_test.get('elapsed_time', 0):.2f} seconds")
        else:
            print(f"✗ Stream response test failed: {stream_test.get('message', '')}")
            
    except Exception as e:
        print(f"Exception during test: {str(e)}") 