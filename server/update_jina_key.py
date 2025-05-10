#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from dotenv import load_dotenv, set_key

# 加载环境变量
load_dotenv("server/.env")

def update_jina_api_key(api_key):
    """
    更新Jina API密钥到.env文件
    
    Args:
        api_key (str): 新的Jina API密钥
    """
    env_file = "server/.env"
    
    # 确保文件存在
    if not os.path.exists(env_file):
        print(f"错误: 环境变量文件不存在: {env_file}")
        return False
    
    try:
        # 更新环境变量文件
        set_key(env_file, "JINA_API_KEY", api_key)
        print(f"成功更新JINA_API_KEY")
        return True
    except Exception as e:
        print(f"更新JINA_API_KEY失败: {str(e)}")
        return False

def main():
    if len(sys.argv) < 2:
        print("用法: python update_jina_key.py <your_jina_api_key>")
        return
    
    api_key = sys.argv[1]
    if not api_key:
        print("错误: API密钥不能为空")
        return
    
    update_jina_api_key(api_key)

if __name__ == "__main__":
    main() 