#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from dotenv import load_dotenv, set_key
import pathlib

# 优先从项目根目录加载.env文件
current_dir = pathlib.Path(__file__).parent.absolute()
root_dir = current_dir.parent
root_env_path = root_dir / ".env"
server_env_path = current_dir / ".env"

env_file = None
if root_env_path.exists():
    env_file = root_env_path
    print(f"使用项目根目录的.env文件: {env_file}")
elif server_env_path.exists():
    env_file = server_env_path
    print(f"使用server目录的.env文件: {env_file}")
else:
    # 如果不存在，则创建一个新的.env文件在项目根目录
    env_file = root_env_path
    print(f"创建新的.env文件在项目根目录: {env_file}")

# 加载环境变量
load_dotenv(dotenv_path=env_file)

def update_jina_api_key(api_key):
    """
    更新Jina API密钥到.env文件
    
    Args:
        api_key (str): 新的Jina API密钥
    """
    # 使用全局定义的env_file
    global env_file
    
    # 确保文件存在
    if not os.path.exists(env_file):
        print(f"错误: 环境变量文件不存在: {env_file}")
        return False
    
    try:
        # 更新环境变量文件
        set_key(env_file, "JINA_API_KEY", api_key)
        print(f"成功更新JINA_API_KEY到 {env_file}")
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