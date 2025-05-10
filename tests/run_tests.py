#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
统一测试管理脚本
用于运行项目中的所有测试脚本
"""

import os
import sys
import time
import argparse
import subprocess
import shutil
from pathlib import Path
import importlib.util
import inspect
import re

# 添加项目根目录到 Python 路径
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))
tests_dir = project_root / "tests"

# ANSI 颜色
COLORS = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "red": "\033[91m",
    "green": "\033[92m",
    "yellow": "\033[93m",
    "blue": "\033[94m",
    "cyan": "\033[96m",
}

def colorize(text, color, bold=False):
    """为文本添加颜色"""
    if bold:
        return f"{COLORS['bold']}{COLORS[color]}{text}{COLORS['reset']}"
    return f"{COLORS[color]}{text}{COLORS['reset']}"

def print_header(title):
    """打印格式化的标题"""
    width = 70
    print("\n" + "=" * width)
    print(colorize(title.center(width), "cyan", True))
    print("=" * width + "\n")

def print_section(title):
    """打印小节标题"""
    print("\n" + colorize(f"## {title}", "blue", True))

def run_shell_command(cmd, cwd=None, env=None):
    """运行shell命令并返回输出和返回码"""
    try:
        print(colorize(f"执行命令: {' '.join(cmd)}", "yellow"))
        result = subprocess.run(
            cmd,
            cwd=cwd or os.getcwd(),
            env=env or os.environ.copy(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8"
        )
        
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(colorize(result.stderr, "red"))
            
        return result.returncode == 0
    except Exception as e:
        print(colorize(f"命令执行失败: {e}", "red"))
        return False

def list_tests():
    """列出所有可用的测试"""
    tests = []
    
    # 1. 搜索 tests 目录中的 Python 测试模块
    if tests_dir.exists():
        test_files = list(tests_dir.glob("*_test.py")) + list(tests_dir.glob("test_*.py"))
        for test_file in test_files:
            module_name = test_file.stem
            if module_name != "__init__":
                tests.append(("python", module_name, test_file))
    
    # 2. 搜索项目根目录中的测试脚本（Python）
    root_test_files = list(project_root.glob("test_*.py"))
    for test_file in root_test_files:
        module_name = test_file.stem
        tests.append(("python", f"root_{module_name}", test_file))
    
    # 3. 搜索测试相关的Shell脚本
    shell_test_files = list(project_root.glob("test_*.sh"))
    for test_file in shell_test_files:
        tests.append(("shell", test_file.stem, test_file))
        
    # 4. 搜索 scripts 目录中的测试相关脚本
    scripts_dir = project_root / "scripts"
    if scripts_dir.exists():
        script_test_files = list(scripts_dir.glob("test_*.sh")) + list(scripts_dir.glob("test_*.py"))
        for test_file in script_test_files:
            tests.append(("script", f"script_{test_file.stem}", test_file))
    
    # 5. 特殊处理 OpenRouter 测试
    openrouter_test = tests_dir / "openrouter_test.py"
    if openrouter_test.exists():
        tests.append(("python", "openrouter", openrouter_test))
    
    return tests

def run_python_test(test_file, args=None):
    """运行 Python 测试脚本"""
    if not args:
        args = []
        
    cmd = [sys.executable, str(test_file)] + args
    return run_shell_command(cmd)

def run_shell_test(test_file, args=None):
    """运行 Shell 测试脚本"""
    if not args:
        args = []
        
    cmd = ["/bin/bash", str(test_file)] + args
    return run_shell_command(cmd)

def run_javascript_test(test_file, args=None):
    """运行 JavaScript 测试脚本"""
    if not args:
        args = []
        
    # 检查node是否可用
    node_check = subprocess.run(
        ["node", "--version"], 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE,
        text=True
    )
    
    if node_check.returncode != 0:
        print(colorize("错误: Node.js 未安装，无法运行 JavaScript 测试", "red"))
        return False
    
    cmd = ["node", str(test_file)] + args
    return run_shell_command(cmd)

def run_specific_test(test_type, test_file, args=None):
    """根据测试类型运行特定测试"""
    if not args:
        args = []
    
    print_section(f"运行测试: {test_file.name}")
    
    start_time = time.time()
    success = False
    
    if test_type == "python":
        success = run_python_test(test_file, args)
    elif test_type == "javascript":
        success = run_javascript_test(test_file, args)
    elif test_type in ["shell", "script"]:
        success = run_shell_test(test_file, args)
    else:
        print(colorize(f"未知的测试类型: {test_type}", "red"))
        return False
    
    elapsed_time = time.time() - start_time
    status = colorize("成功", "green") if success else colorize("失败", "red")
    print(f"\n测试 {test_file.name} {status}, 用时: {elapsed_time:.2f}秒")
    
    return success

def run_openrouter_test(args=None):
    """运行 OpenRouter 测试"""
    print_section("运行 OpenRouter API 测试")
    
    # 默认参数 - 修改为流式输出
    test_args = ["--mode", "normal", "--stream"]
    
    # 如果提供了额外参数，使用这些参数
    if args:
        test_args = args
        
    # 找到测试脚本
    test_file = tests_dir / "openrouter_test.py"
    
    if not test_file.exists():
        print(colorize(f"错误: 找不到 OpenRouter 测试脚本: {test_file}", "red"))
        return False
    
    return run_python_test(test_file, test_args)

def run_backend_tests(args=None):
    """运行后端相关测试"""
    if not args:
        args = []
        
    test_file = tests_dir / "python" / "backend_test.py"
    
    if not test_file.exists():
        print(colorize(f"错误: 找不到后端测试脚本: {test_file}", "red"))
        return False
    
    return run_python_test(test_file, args)

def update_logs():
    """更新日志链接"""
    log_manager = tests_dir / "log_manager.py"
    
    if not log_manager.exists():
        print(colorize("错误: 找不到日志管理脚本", "red"))
        return False
    
    cmd = [sys.executable, str(log_manager), "--update-readme"]
    return run_shell_command(cmd)

def run_all_tests():
    """运行所有测试"""
    print_header("运行所有测试")
    
    # 显示测试文件统计
    summary_path = tests_dir / "test_files_summary.md"
    if summary_path.exists():
        print_section("测试文件统计")
        
        # 计算各类测试文件数量
        script_count = len(list((tests_dir / "scripts").glob("*")))
        js_count = len(list((tests_dir / "js").glob("*")))
        py_count = len(list((tests_dir / "python").glob("*")))
        other_count = len([f for f in tests_dir.glob("*") if f.is_file() and f.name != "test_files_summary.md"])
        
        print(f"项目中已收集的测试文件总数: {script_count + js_count + py_count + other_count}")
        print(f"- 脚本文件: {script_count}")
        print(f"- JavaScript测试: {js_count}")
        print(f"- Python测试: {py_count}")
        print(f"- 其他测试文件: {other_count}")
        print(f"\n完整测试文件列表请查看: tests/test_files_summary.md\n")
    
    # 运行主要测试
    results = []
    
    # 1. 运行前端测试
    print_header("前端测试")
    frontend_test_file = tests_dir / "js" / "frontend_test.js"
    if frontend_test_file.exists():
        frontend_success = run_specific_test("javascript", frontend_test_file)
        results.append(("前端测试", frontend_success))
    else:
        print(colorize("前端测试文件不存在，跳过前端测试", "yellow"))
    
    # 2. 运行后端测试
    print_header("后端测试")
    backend_test_file = tests_dir / "python" / "backend_test.py"
    if backend_test_file.exists():
        backend_success = run_specific_test("python", backend_test_file)
        results.append(("后端测试", backend_success))
    else:
        print(colorize("后端测试文件不存在，跳过后端测试", "yellow"))
    
    # 3. 运行OpenRouter测试
    print_header("OpenRouter测试")
    openrouter_test_file = tests_dir / "openrouter_test.py"
    if openrouter_test_file.exists():
        openrouter_success = run_openrouter_test()
        results.append(("OpenRouter测试", openrouter_success))
    else:
        print(colorize("OpenRouter测试文件不存在，跳过OpenRouter测试", "yellow"))
    
    # 4. 显示结果摘要
    print_header("测试结果摘要")
    
    success_count = sum(1 for _, success in results if success)
    print(f"总测试数: {len(results)}")
    print(f"成功: {success_count}")
    print(f"失败: {len(results) - success_count}")
    
    if len(results) - success_count > 0:
        print("\n失败的测试:")
        for test_name, success in results:
            if not success:
                print(colorize(f"- {test_name}", "red"))
    
    # 5. 更新日志链接
    print_section("更新日志链接")
    update_logs()
    
    return success_count == len(results)

def collect_test_files():
    """
    扫描整个项目，将所有test开头或结尾的文件移动或复制到tests目录中
    """
    print_header("收集测试文件")
    
    # 要扫描的目录
    test_file_patterns = [
        # 测试文件模式
        "*_test.*", "test_*.*", "*test.*", "*.test.*",
        # 包含test的脚本
        "*test*.sh", "*test*.py", "*test*.js",
    ]
    
    # 忽略的目录模式
    ignore_dirs = [
        "node_modules", "venv", "__pycache__", ".git", 
        "logs", "dist", "build", "docs", "tests"
    ]
    
    # 确保测试目录存在
    tests_dir.mkdir(exist_ok=True)
    
    # 创建测试子目录
    test_scripts_dir = tests_dir / "scripts"
    test_scripts_dir.mkdir(exist_ok=True)
    
    test_js_dir = tests_dir / "js"
    test_js_dir.mkdir(exist_ok=True)
    
    test_python_dir = tests_dir / "python"
    test_python_dir.mkdir(exist_ok=True)
    
    # 收集找到的文件
    found_files = []
    
    print(f"{colorize('搜索项目目录中的测试文件...', 'blue')}")
    
    # 遍历项目目录
    for root, dirs, files in os.walk(project_root, topdown=True):
        # 修改dirs列表，跳过忽略的目录
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        root_path = Path(root)
        
        # 检查每个文件
        for file in files:
            file_path = root_path / file
            
            # 检查文件名是否匹配测试模式
            for pattern in test_file_patterns:
                if Path(file).match(pattern):
                    rel_path = file_path.relative_to(project_root)
                    found_files.append((file_path, rel_path))
                    break
    
    print(f"找到 {len(found_files)} 个测试文件")
    
    # 移动文件到测试目录
    moved_count = 0
    for file_path, rel_path in found_files:
        # 跳过测试目录中的文件
        if str(rel_path).startswith("tests/"):
            continue
            
        # 确定目标路径
        extension = file_path.suffix.lower()
        
        if extension == ".sh":
            target_dir = test_scripts_dir
        elif extension == ".js":
            target_dir = test_js_dir
        elif extension == ".py":
            target_dir = test_python_dir
        else:
            target_dir = tests_dir
        
        target_path = target_dir / file_path.name
        
        # 如果文件已存在，添加时间戳避免冲突
        if target_path.exists():
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            stem = target_path.stem
            suffix = target_path.suffix
            target_path = target_dir / f"{stem}_{timestamp}{suffix}"
        
        try:
            # 复制文件到目标位置
            shutil.copy2(file_path, target_path)
            print(f"{colorize('✓', 'green')} 复制 {rel_path} 到 {target_path.relative_to(project_root)}")
            moved_count += 1
        except Exception as e:
            print(f"{colorize('✗', 'red')} 复制 {rel_path} 失败: {e}")
    
    print(f"\n成功复制 {moved_count} 个测试文件到 tests 目录")
    
    # 创建汇总文档
    summary_path = tests_dir / "test_files_summary.md"
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("# 测试文件汇总\n\n")
        f.write("以下是从项目中收集的测试文件列表：\n\n")
        
        f.write("## 脚本文件\n\n")
        script_files = list(test_scripts_dir.glob("*"))
        for file in script_files:
            f.write(f"- [{file.name}](./scripts/{file.name})\n")
        
        f.write("\n## JavaScript测试\n\n")
        js_files = list(test_js_dir.glob("*"))
        for file in js_files:
            f.write(f"- [{file.name}](./js/{file.name})\n")
        
        f.write("\n## Python测试\n\n")
        py_files = list(test_python_dir.glob("*"))
        for file in py_files:
            f.write(f"- [{file.name}](./python/{file.name})\n")
        
        f.write("\n## 其他测试文件\n\n")
        other_files = [f for f in tests_dir.glob("*") if f.is_file() and f.name != "test_files_summary.md"]
        for file in other_files:
            f.write(f"- [{file.name}](./{file.name})\n")
    
    print(f"{colorize('已创建测试文件汇总:', 'green')} tests/test_files_summary.md")
    return moved_count > 0

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="统一测试管理脚本")
    
    # 测试选择
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--all", action="store_true", help="运行所有测试")
    group.add_argument("--openrouter", action="store_true", help="运行 OpenRouter API 测试")
    group.add_argument("--stream", action="store_true", help="运行 OpenRouter API 流式输出测试")
    group.add_argument("--backend", action="store_true", help="运行后端测试")
    group.add_argument("--frontend", action="store_true", help="运行前端测试")
    group.add_argument("--update-logs", action="store_true", help="仅更新日志链接")
    group.add_argument("--collect-tests", action="store_true", help="收集项目中的测试文件")
    
    # 测试参数
    parser.add_argument("--args", nargs=argparse.REMAINDER, help="传递给测试的额外参数")
    
    args = parser.parse_args()
    extra_args = args.args if args.args else []
    
    # 显示基本信息
    print(f"Python 版本: {sys.version}")
    print(f"工作目录: {os.getcwd()}")
    
    # 运行指定的测试
    if args.openrouter:
        print_header("OpenRouter API 测试")
        success = run_openrouter_test(extra_args)
    elif args.stream:
        print_header("OpenRouter API 流式输出测试")
        success = run_openrouter_test(["--mode", "normal", "--stream"] + extra_args)
    elif args.backend:
        print_header("后端测试")
        success = run_backend_tests(extra_args)
    elif args.frontend:
        print_header("前端测试")
        frontend_test_file = tests_dir / "js" / "frontend_test.js"
        if frontend_test_file.exists():
            success = run_specific_test("javascript", frontend_test_file, extra_args)
        else:
            print(colorize("前端测试文件不存在", "red"))
            success = False
    elif args.update_logs:
        print_header("更新日志链接")
        success = update_logs()
    elif args.collect_tests:
        print_header("收集测试文件")
        success = collect_test_files()
    else:
        # 默认运行所有测试
        success = run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main()) 