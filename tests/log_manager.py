#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
日志管理工具
用于创建指向最新日志文件的符号链接
"""

import os
import sys
import glob
from pathlib import Path
import time
import shutil
import argparse

# 项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOGS_DIR = PROJECT_ROOT / "logs"
SYMLINKS_DIR = PROJECT_ROOT / "logs_latest"


def ensure_dir(directory):
    """确保目录存在"""
    directory = Path(directory)
    if not directory.exists():
        print(f"创建目录: {directory}")
        directory.mkdir(parents=True, exist_ok=True)
    return directory


def find_latest_logs():
    """
    在logs目录中找到最新的日志文件
    返回包含服务名称和文件路径的字典
    """
    if not LOGS_DIR.exists():
        print(f"错误: 找不到日志目录 {LOGS_DIR}")
        return {}

    # 查找所有日志文件
    log_files = list(LOGS_DIR.glob("*.log"))
    if not log_files:
        print("未找到日志文件")
        return {}

    # 按修改时间排序
    log_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    # 存储各服务最新的日志文件
    latest_logs = {}
    
    # 处理以服务名开头的日志文件（如 backend_*.log, frontend_*.log）
    for log_file in log_files:
        # 提取服务名称
        name_parts = log_file.name.split("_", 1)
        if len(name_parts) > 1 and name_parts[0]:
            service_name = name_parts[0]
            # 如果还没有该服务的日志或这个日志比已记录的更新
            if service_name not in latest_logs:
                latest_logs[service_name] = log_file
    
    return latest_logs


def create_symlinks(latest_logs, verbose=False):
    """
    创建指向最新日志文件的符号链接
    """
    ensure_dir(SYMLINKS_DIR)
    
    created_links = 0
    for service_name, log_path in latest_logs.items():
        symlink_path = SYMLINKS_DIR / f"{service_name}.log"
        
        # 如果符号链接已存在，先删除
        if symlink_path.exists():
            if verbose:
                print(f"删除已存在的链接: {symlink_path}")
            symlink_path.unlink()
        
        # 创建从最新日志到目标链接的相对路径
        # 这样即使项目目录被移动，链接仍然有效
        rel_path = os.path.relpath(log_path, SYMLINKS_DIR)
        
        try:
            if verbose:
                print(f"创建链接: {symlink_path} -> {rel_path}")
            
            # 在Windows上使用复制，在Unix系统上使用软链接
            if os.name == 'nt':
                # Windows可能不支持符号链接或需要管理员权限
                shutil.copy2(log_path, symlink_path)
                print(f"已复制 {service_name} 日志到 {symlink_path}")
            else:
                # Unix系统创建符号链接
                os.symlink(rel_path, symlink_path)
                print(f"已创建 {service_name} 日志链接: {symlink_path}")
            
            created_links += 1
        except Exception as e:
            print(f"为 {service_name} 创建链接时出错: {e}")
    
    return created_links


def update_readme():
    """
    更新README.md，添加日志链接的说明
    """
    readme_path = PROJECT_ROOT / "README.md"
    if not readme_path.exists():
        print("README.md不存在，无法更新")
        return False
    
    content = readme_path.read_text(encoding="utf-8")
    
    # 检查是否已经包含日志链接的说明
    log_section_heading = "## 日志文件"
    if log_section_heading in content:
        print("README.md已包含日志说明部分，不需要更新")
        return False
    
    # 添加日志链接的说明
    log_section = f"""
{log_section_heading}

项目日志链接位于 `logs_latest` 目录：

- `backend.log` - 后端服务最新日志
- `frontend.log` - 前端服务最新日志

可以通过 `logs_latest/服务名.log` 快速访问最新日志，无需在 `logs` 目录中寻找特定日期的文件。
"""
    
    # 将日志部分添加到README文件末尾
    with open(readme_path, "a", encoding="utf-8") as f:
        f.write(log_section)
    
    print("成功更新README.md，添加了日志链接说明")
    return True


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="日志链接管理工具")
    parser.add_argument("--verbose", "-v", action="store_true", help="显示详细信息")
    parser.add_argument("--update-readme", "-r", action="store_true", help="更新README.md添加日志链接说明")
    args = parser.parse_args()
    
    print("查找最新日志文件...")
    latest_logs = find_latest_logs()
    
    if not latest_logs:
        print("未找到日志文件，无法创建链接")
        return 1
    
    print(f"找到 {len(latest_logs)} 个服务的日志文件:")
    for service, path in latest_logs.items():
        mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(path.stat().st_mtime))
        print(f"- {service}: {path.name} (修改时间: {mtime})")
    
    created = create_symlinks(latest_logs, args.verbose)
    print(f"创建了 {created} 个日志链接")
    
    if args.update_readme:
        update_readme()
    
    if created > 0:
        print(f"\n现在您可以通过 {SYMLINKS_DIR}/<服务名>.log 访问最新日志")
        return 0
    else:
        print("未创建任何日志链接")
        return 1


if __name__ == "__main__":
    exit(main()) 
# -*- coding: utf-8 -*-

"""
日志管理工具
用于创建指向最新日志文件的符号链接
"""

import os
import sys
import glob
from pathlib import Path
import time
import shutil
import argparse

# 项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOGS_DIR = PROJECT_ROOT / "logs"
SYMLINKS_DIR = PROJECT_ROOT / "logs_latest"


def ensure_dir(directory):
    """确保目录存在"""
    directory = Path(directory)
    if not directory.exists():
        print(f"创建目录: {directory}")
        directory.mkdir(parents=True, exist_ok=True)
    return directory


def find_latest_logs():
    """
    在logs目录中找到最新的日志文件
    返回包含服务名称和文件路径的字典
    """
    if not LOGS_DIR.exists():
        print(f"错误: 找不到日志目录 {LOGS_DIR}")
        return {}

    # 查找所有日志文件
    log_files = list(LOGS_DIR.glob("*.log"))
    if not log_files:
        print("未找到日志文件")
        return {}

    # 按修改时间排序
    log_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    # 存储各服务最新的日志文件
    latest_logs = {}
    
    # 处理以服务名开头的日志文件（如 backend_*.log, frontend_*.log）
    for log_file in log_files:
        # 提取服务名称
        name_parts = log_file.name.split("_", 1)
        if len(name_parts) > 1 and name_parts[0]:
            service_name = name_parts[0]
            # 如果还没有该服务的日志或这个日志比已记录的更新
            if service_name not in latest_logs:
                latest_logs[service_name] = log_file
    
    return latest_logs


def create_symlinks(latest_logs, verbose=False):
    """
    创建指向最新日志文件的符号链接
    """
    ensure_dir(SYMLINKS_DIR)
    
    created_links = 0
    for service_name, log_path in latest_logs.items():
        symlink_path = SYMLINKS_DIR / f"{service_name}.log"
        
        # 如果符号链接已存在，先删除
        if symlink_path.exists():
            if verbose:
                print(f"删除已存在的链接: {symlink_path}")
            symlink_path.unlink()
        
        # 创建从最新日志到目标链接的相对路径
        # 这样即使项目目录被移动，链接仍然有效
        rel_path = os.path.relpath(log_path, SYMLINKS_DIR)
        
        try:
            if verbose:
                print(f"创建链接: {symlink_path} -> {rel_path}")
            
            # 在Windows上使用复制，在Unix系统上使用软链接
            if os.name == 'nt':
                # Windows可能不支持符号链接或需要管理员权限
                shutil.copy2(log_path, symlink_path)
                print(f"已复制 {service_name} 日志到 {symlink_path}")
            else:
                # Unix系统创建符号链接
                os.symlink(rel_path, symlink_path)
                print(f"已创建 {service_name} 日志链接: {symlink_path}")
            
            created_links += 1
        except Exception as e:
            print(f"为 {service_name} 创建链接时出错: {e}")
    
    return created_links


def update_readme():
    """
    更新README.md，添加日志链接的说明
    """
    readme_path = PROJECT_ROOT / "README.md"
    if not readme_path.exists():
        print("README.md不存在，无法更新")
        return False
    
    content = readme_path.read_text(encoding="utf-8")
    
    # 检查是否已经包含日志链接的说明
    log_section_heading = "## 日志文件"
    if log_section_heading in content:
        print("README.md已包含日志说明部分，不需要更新")
        return False
    
    # 添加日志链接的说明
    log_section = f"""
{log_section_heading}

项目日志链接位于 `logs_latest` 目录：

- `backend.log` - 后端服务最新日志
- `frontend.log` - 前端服务最新日志

可以通过 `logs_latest/服务名.log` 快速访问最新日志，无需在 `logs` 目录中寻找特定日期的文件。
"""
    
    # 将日志部分添加到README文件末尾
    with open(readme_path, "a", encoding="utf-8") as f:
        f.write(log_section)
    
    print("成功更新README.md，添加了日志链接说明")
    return True


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="日志链接管理工具")
    parser.add_argument("--verbose", "-v", action="store_true", help="显示详细信息")
    parser.add_argument("--update-readme", "-r", action="store_true", help="更新README.md添加日志链接说明")
    args = parser.parse_args()
    
    print("查找最新日志文件...")
    latest_logs = find_latest_logs()
    
    if not latest_logs:
        print("未找到日志文件，无法创建链接")
        return 1
    
    print(f"找到 {len(latest_logs)} 个服务的日志文件:")
    for service, path in latest_logs.items():
        mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(path.stat().st_mtime))
        print(f"- {service}: {path.name} (修改时间: {mtime})")
    
    created = create_symlinks(latest_logs, args.verbose)
    print(f"创建了 {created} 个日志链接")
    
    if args.update_readme:
        update_readme()
    
    if created > 0:
        print(f"\n现在您可以通过 {SYMLINKS_DIR}/<服务名>.log 访问最新日志")
        return 0
    else:
        print("未创建任何日志链接")
        return 1


if __name__ == "__main__":
    exit(main()) 