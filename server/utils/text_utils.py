import re

def is_chinese(text):
    """判断文本是否包含中文字符"""
    return re.search(r'[\u4e00-\u9fff]', text) is not None 