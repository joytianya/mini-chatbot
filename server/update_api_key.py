#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import subprocess
import sys
import pathlib
from dotenv import load_dotenv
from dotenv import set_key
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("api_key_updater")

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
load_dotenv(env_file)

def update_api_key(new_key, env_file_path=None):
    """
    更新环境变量中的API密钥
    
    Args:
        new_key: 新的API密钥
        env_file_path: 环境变量文件路径
    """
    # 使用全局定义的env_file，如果没有提供env_file_path参数
    global env_file
    env_file_to_use = env_file_path if env_file_path else env_file
    
    # 检查文件是否存在
    if not os.path.exists(env_file_to_use):
        with open(env_file_to_use, 'w') as f:
            f.write("# 环境变量配置文件\n")
        logger.info(f"创建了新的环境变量文件: {env_file_to_use}")
    
    try:
        # 更新API密钥
        set_key(env_file_to_use, "OPENROUTER_API_KEY", new_key)
        logger.info(f"API密钥已更新到: {env_file_to_use}")
        
        # 重新加载环境变量
        load_dotenv(override=True)
        
        return True, f"API密钥已成功更新到 {env_file_to_use}"
    except Exception as e:
        logger.error(f"更新API密钥时出错: {str(e)}")
        return False, f"更新API密钥失败: {str(e)}"

def test_connection():
    """测试OpenRouter API连接"""
    try:
        # 调用测试脚本
        test_script = os.path.join(root_dir, "tests", "openrouter_test.py")
        if not os.path.exists(test_script):
            logger.error(f"测试脚本不存在: {test_script}")
            return False
            
        logger.info(f"使用测试脚本: {test_script}")
        result = subprocess.run([sys.executable, test_script, "--query", "测试API连接", "--mode", "simple"], 
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