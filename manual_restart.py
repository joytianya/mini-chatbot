#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import signal
import time
import subprocess
import psutil

def find_process_by_name(name):
    """根据进程名称查找进程ID"""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        if name in ' '.join(proc.info['cmdline'] or []):
            return proc.info['pid']
    return None

def stop_backend():
    """停止后端服务"""
    print("正在停止后端服务...")
    pid = find_process_by_name("server/app.py")
    
    if pid:
        try:
            os.kill(pid, signal.SIGTERM)
            print(f"已停止后端服务 (PID: {pid})")
            time.sleep(2)  # 等待进程完全退出
        except Exception as e:
            print(f"停止后端服务时出错: {str(e)}")
    else:
        print("未找到运行中的后端服务")

def start_backend():
    """启动后端服务"""
    print("正在启动后端服务...")
    
    try:
        # 启动后端服务
        backend_log = os.path.join("logs", f"backend_{time.strftime('%Y%m%d_%H%M%S')}.log")
        
        # 确保日志目录存在
        os.makedirs(os.path.dirname(backend_log), exist_ok=True)
        
        # 创建最新日志的符号链接
        latest_log = os.path.join("logs", "backend_latest.log")
        if os.path.exists(latest_log):
            try:
                os.remove(latest_log)
            except:
                pass
        
        # 使用subprocess启动后端
        process = subprocess.Popen(
            ["python", "server/app.py"], 
            stdout=open(backend_log, "w"),
            stderr=subprocess.STDOUT
        )
        
        # 创建符号链接指向最新日志
        try:
            os.symlink(backend_log, latest_log)
        except:
            pass
            
        print(f"后端服务已启动 (PID: {process.pid})")
        print(f"日志保存在: {backend_log}")
        print(f"最新日志符号链接: {latest_log}")
        
        return True
    except Exception as e:
        print(f"启动后端服务时出错: {str(e)}")
        return False

def main():
    print("===== 手动重启后端服务 =====")
    
    # 停止后端服务
    stop_backend()
    
    # 启动后端服务
    start_backend()
    
    print("===== 操作完成 =====")

if __name__ == "__main__":
    main() 