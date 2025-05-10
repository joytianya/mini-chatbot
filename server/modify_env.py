#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os

def add_jina_key():
    """添加Jina API密钥到.env文件"""
    env_file = ".env"
    
    # 检查文件是否存在
    if not os.path.exists(env_file):
        print(f"错误: 环境变量文件不存在: {env_file}")
        return False
    
    try:
        # 读取当前的环境变量文件
        with open(env_file, 'r') as f:
            content = f.read()
        
        # 检查是否已有JINA_API_KEY
        if "JINA_API_KEY=" not in content:
            # 添加新行
            with open(env_file, 'a') as f:
                f.write("\n# Jina API 设置\nJINA_API_KEY=YOUR_JINA_API_KEY_HERE\n")
            print(f"成功添加JINA_API_KEY到{env_file}")
        else:
            print("JINA_API_KEY已存在")
        
        return True
    except Exception as e:
        print(f"修改环境变量文件时出错: {str(e)}")
        return False

if __name__ == "__main__":
    add_jina_key() 