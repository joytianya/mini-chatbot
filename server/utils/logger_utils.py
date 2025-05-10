import logging
from logging import Formatter, StreamHandler, FileHandler
import traceback
import os
import json
import sys

# 创建自定义格式化器
class CustomFormatter(Formatter):
    def format(self, record):
        # 保存原始消息
        original_msg = record.msg
        separator = record.__dict__.get('separator', '')
        
        # 获取调用日志的文件名和行号（为所有日志级别添加）
        tb = traceback.extract_stack()
        # 获取调用日志的文件名和行号（通常是倒数第二个堆栈帧）
        filename, line_no, func_name, _ = tb[-2]
        location_info = f"[{os.path.basename(filename)}:{line_no}] "
        
        # 设置基本格式
        record.msg = f"{location_info}{original_msg}\n{separator}" if separator else f"{location_info}{original_msg}"
        
        # 调用父类的 format 方法
        return super().format(record)

def setup_logger():
    """配置日志系统"""
    logger = logging.getLogger()
    
    # 创建处理器并设置格式化器
    # 尝试为 StreamHandler 设置 UTF-8 编码
    # 注意：这在所有 Python 版本和环境中不一定完全可靠，
    # 最可靠的方法还是确保运行环境 (如通过 PYTHONIOENCODING) 使用 UTF-8。
    # 但我们在这里添加它作为一层额外的保障。
    try:
        # Python 3.9+ 支持直接为 StreamHandler 设置 encoding
        handler = StreamHandler(sys.stdout, encoding='utf-8')
    except TypeError:
        # 对于旧版本 Python，StreamHandler 可能不接受 encoding 参数
        # 此时依赖于 sys.stdout 本身的编码 (应通过环境变量设置)
        handler = StreamHandler(sys.stdout)

    handler.setFormatter(CustomFormatter(
        fmt='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    ))
    
    # 移除所有现有的处理器
    for h in logger.handlers[:]:
        logger.removeHandler(h)
    
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    return logger

# 自定义日志格式
def log_separator(length=80):
    return "-" * length

class CustomLogger:
    @staticmethod
    def request(method, path, data=None):
        logger = logging.getLogger(__name__)
        separator = f"""请求详情:
方法: {method}
路径: {path}
数据: {json.dumps(data, ensure_ascii=False, indent=2) if data else 'None'}
{log_separator()}"""
        
        logger.info(
            "收到请求",
            extra={'separator': separator}
        )

    @staticmethod
    def chat_completion(query, docs_count, context):
        logger = logging.getLogger(__name__)
        separator = f"""查询详情:
用户问题: {query}
找到文档数: {docs_count}

相关文档内容:
{context}
{log_separator()}"""
        
        logger.info(
            "处理聊天请求",
            extra={'separator': separator}
        )

    @staticmethod
    def response_complete(query, full_response):
        logger = logging.getLogger(__name__)
        separator = f"""响应详情:
用户问题: {query}
完整响应:
{full_response}
{log_separator()}"""
        
        logger.info(
            "生成响应完成",
            extra={'separator': separator}
        ) 