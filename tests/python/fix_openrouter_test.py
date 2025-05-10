#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
OpenRouter.ai API connection test fix script
Avoid Latin-1 encoding issues
"""

import os
import json
import requests
import logging
import argparse
from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openrouter_fix")

def load_env_vars():
    """Load environment variables from .env files"""
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

def test_openrouter_connection(api_key=None, base_url=None, model_name=None):
    """Test OpenRouter API connection"""
    # Use provided values or get from environment variables
    if not api_key:
        api_key = os.getenv('OPENROUTER_API_KEY')
    if not api_key:
        logger.error("Missing API Key")
        return False, "Missing API Key"
    
    if not base_url:
        base_url = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api')
    
    if not model_name:
        model_name = os.getenv('OPENROUTER_MODEL_NAME', 'qwen/qwen3-1.7b')
    
    url = f"{base_url}/v1/chat/completions"
    
    # Use ASCII characters only for request headers
    headers = {
        "content-type": "application/json",
        "authorization": f"Bearer {api_key}",
        "http-referer": "http://localhost:5173",
        "x-title": "Mini-Chatbot-Test"  # Avoid non-ASCII characters
    }
    
    # Simple test message
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": "Hello, are you working?"}
        ],
        "temperature": 0.7,
        "max_tokens": 50,
        "stream": False
    }
    
    logger.info(f"Sending request to {url}")
    # Use ensure_ascii=True to ensure JSON string only contains ASCII characters
    logger.info(f"Headers: {json.dumps(headers, ensure_ascii=True)}")
    logger.info(f"Payload: {json.dumps(payload, ensure_ascii=True)}")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        logger.info(f"Request successful, response: {content}")
        
        return True, content
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return False, str(e)

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Test OpenRouter API connection")
    parser.add_argument("--api-key", help="OpenRouter API key")
    parser.add_argument("--base-url", help="OpenRouter base URL", default="https://openrouter.ai/api")
    parser.add_argument("--model", help="Model name to use", default="qwen/qwen3-1.7b")
    args = parser.parse_args()
    
    # Load environment variables
    load_env_vars()
    
    print("\n===== OpenRouter.ai API Connection Test =====")
    success, message = test_openrouter_connection(api_key=args.api_key, base_url=args.base_url, model_name=args.model)
    
    if success:
        print(f"✓ Connection successful! Response: {message}")
    else:
        print(f"❌ Connection failed: {message}") 