import re
import logging

logger = logging.getLogger(__name__)

def is_chinese(text):
    """判断文本是否包含中文字符"""
    return re.search(r'[\u4e00-\u9fff]', text) is not None 

def clean_messages(messages):
    """
    清理消息数组，只保留role和content字段，删除id、timestamp等无关字段
    
    Args:
        messages: 原始消息数组
    
    Returns:
        list: 清理后的消息数组
    """
    if not messages or not isinstance(messages, list):
        return messages
    
    cleaned_messages = []
    for msg in messages:
        if isinstance(msg, dict):
            # 只保留必要的字段
            cleaned_msg = {
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            }
            cleaned_messages.append(cleaned_msg)
        else:
            logger.warning(f"非法消息格式: {type(msg)}")
    
    return cleaned_messages