from flask import request, jsonify
import os
import traceback
import logging
from utils.file_utils import allowed_file, process_filename, check_sensitive_info, is_masked_file
from utils.logger_utils import CustomLogger

logger = logging.getLogger(__name__)

def register_upload_routes(app, doc_store, upload_folder):
    """注册上传相关路由"""
    
    @app.route('/upload', methods=['POST'])
    def upload_file():
        logger.info("开始处理文件上传请求")
        if 'documents' not in request.files:
            logger.error("请求中未包含文件")
            return jsonify({'error': 'No file part'}), 400
        
        sensitive_info_protected = request.form.get('sensitive_info_protected', 'false') == 'true'
        logger.info(f"敏感信息保护: {'启用' if sensitive_info_protected else '禁用'}")
        
        file = request.files['documents']
        if file.filename == '':
            logger.error("未选择文件")
            return jsonify({'error': 'No selected file'}), 400
        
        if file and allowed_file(file.filename):
            try:
                # 保留原始文件名，但确保安全
                original_filename = file.filename
                # 检查文件名是否包含_masked后缀
                is_masked = is_masked_file(original_filename)
                logger.info(f"接收到的文件: {original_filename}, 是否为掩码处理后的文件: {is_masked}")
                
                # 读取文件内容并检查
                file_content = file.read().decode('utf-8', errors='ignore')
                file_size = len(file_content)
                content_preview = file_content[:200] + '...' if len(file_content) > 200 else file_content
                logger.info(f"文件内容预览: {content_preview}")
                
                # 检查敏感信息
                check_sensitive_info(file_content, sensitive_info_protected)
                
                # 重置文件指针
                file.seek(0)
                
                # 处理文件名
                safe_filename = process_filename(original_filename)
                file_path = os.path.join(upload_folder, safe_filename)
                logger.info(f"准备保存文件: {safe_filename}, 大小: {file_size} bytes")
                file.save(file_path)
                logger.info(f"文件已保存到: {file_path}")
                
                # 使用doc_store处理文件
                logger.info("开始处理文件...")
                result = doc_store.process_single_file(file_path)
                if result['success']:
                    logger.info(f"文件处理成功, document_id: {result['document_id']}")
                    return jsonify({
                        'message': '文件上传并处理成功',
                        'document_id': result['document_id']
                    })
                else:
                    logger.error("文件处理失败")
                    return jsonify({'error': '文件处理失败'}), 500
                
            except Exception as e:
                logger.error(f"文件上传处理过程出错: {str(e)}\n{traceback.format_exc()}")
                return jsonify({'error': str(e)}), 500
        else:
            logger.error(f"不支持的文件类型: {file.filename}")
            return jsonify({'error': '不支持的文件类型'}), 400 