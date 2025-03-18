import os
import re
from werkzeug.utils import secure_filename
from datetime import datetime
from pypinyin import lazy_pinyin
import logging

logger = logging.getLogger(__name__)

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    """检查文件扩展名是否在允许列表中"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_filename(original_filename):
    """处理文件名，将中文转为拼音，确保保留扩展名"""
    if '.' in original_filename:
        filename_base, filename_ext = original_filename.rsplit('.', 1)
        # 将中文转为拼音
        pinyin_filename_base = ''.join(lazy_pinyin(filename_base))
        # 使用时间戳创建唯一文件名，保留原始扩展名
        #timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        #safe_filename = f"{timestamp}_{secure_filename(pinyin_filename_base)}.{filename_ext}"
        safe_filename = f"{secure_filename(pinyin_filename_base)}.{filename_ext}"
    else:
        # 如果没有扩展名，使用时间戳作为文件名
        pinyin_filename = ''.join(lazy_pinyin(original_filename))
        #timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        #safe_filename = f"{timestamp}_{secure_filename(pinyin_filename)}"
        safe_filename = f"{secure_filename(pinyin_filename)}"
    
    logger.info(f"原始文件名: {original_filename}, 转拼音后: {safe_filename}")
    return safe_filename

def check_sensitive_info(file_content, sensitive_info_protected=False):
    """检查文件内容中是否包含敏感信息"""
    # 检查是否包含手机号码
    phone_pattern = re.compile(r'\b1\d{10}\b')
    phone_matches = phone_pattern.findall(file_content)
    if phone_matches:
        logger.warning(f"文件中包含未掩码的手机号码: {phone_matches[:3]}")
        if sensitive_info_protected:
            logger.error("警告：敏感信息保护已启用，但文件中仍包含未掩码的手机号码")
    return phone_matches

def is_masked_file(filename):
    """检查文件名是否包含_masked后缀，这表明它是经过掩码处理的"""
    return '_masked.' in filename 