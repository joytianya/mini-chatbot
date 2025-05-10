#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import subprocess
import sys
from dotenv import load_dotenv
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("api_key_updater")

def update_api_key(new_key, env_file=".env"):
    """更新环境变量文件中的API密钥
    
    Args:
        new_key: 新的API密钥
        env_file: 环境变量文件路径
    """
    # 加载当前的环境变量
    load_dotenv(env_file)
    
    # 检查文件是否存在
    if not os.path.exists(env_file):
        logger.error(f"环境文件不存在: {env_file}")
        return False
    
    try:
        # 读取当前的环境变量文件
        with open(env_file, 'r') as f:
            lines = f.readlines()
        
        # 查找并更新OPENROUTER_API_KEY行
        key_updated = False
        for i, line in enumerate(lines):
            if line.strip().startswith('OPENROUTER_API_KEY='):
                lines[i] = f'OPENROUTER_API_KEY={new_key}\n'
                key_updated = True
                break
        
        # 如果没有找到OPENROUTER_API_KEY行，则添加新行
        if not key_updated:
            lines.append(f'OPENROUTER_API_KEY={new_key}\n')
        
        # 写回环境变量文件
        with open(env_file, 'w') as f:
            f.writelines(lines)
        
        logger.info(f"成功更新API密钥到{env_file}")
        return True
    
    except Exception as e:
        logger.error(f"更新API密钥时出错: {str(e)}")
        return False

def test_connection():
    """测试OpenRouter API连接"""
    try:
        # 调用测试脚本
        result = subprocess.run([sys.executable, "test_openrouter.py"], 
                               capture_output=True, text=True)
        
        print(result.stdout)
        
        if result.returncode != 0:
            print(f"错误输出: {result.stderr}")
            return False
        
        return True
    
    except Exception as e:
        logger.error(f"测试连接时出错: {str(e)}")
        return False

def main():
    # 新的API密钥
    new_api_key = "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"
    
    # 尝试更新API密钥
    if not update_api_key(new_api_key):
        print("更新API密钥失败，退出测试")
        return
    
    # 重新加载环境变量以确保使用新的API密钥
    load_dotenv(override=True)
    
    # 测试连接
    success = test_connection()
    print(f"连接测试: {'成功' if success else '失败'}")

if __name__ == "__main__":
    main() 