import logging
from logging import Formatter, StreamHandler
import traceback
import os
import json

# 创建自定义格式化器
class CustomFormatter(Formatter):
    def format(self, record):
        # 保存原始消息
        original_msg = record.msg
        separator = record.__dict__.get('separator', '')
        
        # 如果是错误日志，添加堆栈信息
        if record.levelno >= logging.ERROR:
            tb = traceback.extract_stack()
            # 获取调用日志的文件名和行号
            filename, line_no, func_name, _ = tb[-2]
            location_info = f"[{os.path.basename(filename)}:{line_no}] "
        else:
            location_info = ""
        
        # 设置基本格式
        record.msg = f"{location_info}{original_msg}\n{separator}" if separator else f"{location_info}{original_msg}"
        
        # 调用父类的 format 方法
        return super().format(record)

def setup_logger():
    """配置日志系统"""
    logger = logging.getLogger()
    
    # 创建处理器并设置格式化器
    handler = StreamHandler()
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