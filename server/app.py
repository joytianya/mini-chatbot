# -*- coding: utf-8 -*-
# 设置全局编码为 UTF-8
import sys
import io
import locale

# 确保控制台输出使用 UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 尝试设置 locale
try:
    locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_ALL, 'C.UTF-8')
    except locale.Error:
        pass  # 如果设置失败，继续使用默认值

from flask import Flask, request, jsonify, Response, stream_with_context, make_response
from flask_cors import CORS
import os
from document_store import DocumentStore
from werkzeug.utils import secure_filename
import json
from openai import OpenAI
from dotenv import load_dotenv
import logging
from logging import Formatter, StreamHandler
import socket
from werkzeug.middleware.proxy_fix import ProxyFix
import traceback
from jina import JinaChatAPI
from web_kg import get_web_kg  # 添加web_kg导入
import asyncio
from functools import partial
from system_prompts import search_answer_zh_template, search_answer_en_template
from datetime import datetime
from flask_apscheduler import APScheduler  # 添加APScheduler导入
from searx_instances import SearxSpaceParser  # 添加SearxSpaceParser导入
from pypinyin import lazy_pinyin  # 添加pypinyin导入

# 导入自定义模块
from utils.logger_utils import setup_logger, CustomLogger
from utils.file_utils import ALLOWED_EXTENSIONS
from routes.upload_routes import register_upload_routes
from routes.chat_routes import register_chat_routes
from routes.doc_chat_routes import register_doc_chat_routes
from routes.test_routes import register_test_routes  # 添加新的导入

# 加载环境变量
# 优先从项目根目录加载.env文件
import pathlib
current_dir = pathlib.Path(__file__).parent.absolute()
root_dir = current_dir.parent
root_env_path = root_dir / ".env"
server_env_path = current_dir / ".env"

if root_env_path.exists():
    load_dotenv(dotenv_path=root_env_path)
    print(f"已从项目根目录加载环境变量: {root_env_path}")
elif server_env_path.exists():
    load_dotenv(dotenv_path=server_env_path)
    print(f"已从server目录加载环境变量: {server_env_path}")
else:
    print("警告: 未找到.env文件")

# 配置日志
logger = setup_logger()

# 创建应用
app = Flask(__name__)

# 配置 CORS
CORS(app, 
    resources={
        r"/*": {
            "origins": [
                "http://localhost:5173", 
                "http://192.168.1.11:5173",  # 添加本地IP
                "https://joytianya.github.io",
                "https://mini-chatbot-backend.onrender.com"
            ],
            "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization", "Accept", "X-Requested-With", "Origin", 
                             "X-Title", "HTTP-Referer", "x-title", "http-referer",
                             "content-type", "authorization", "accept", "x-requested-with", "origin"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type", "X-CSRFToken"],
            "max_age": 3600
        }
    }
)

# 配置代理服务器设置
app.wsgi_app = ProxyFix(
    app.wsgi_app, 
    x_for=1,      # X-Forwarded-For
    x_proto=1,    # X-Forwarded-Proto
    x_host=1,     # X-Forwarded-Host
    x_port=1      # X-Forwarded-Port
)

# 配置文件上传
UPLOAD_FOLDER = './documents'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 确保上传目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 判断query是否为中文
import re
def is_chinese(query):
    return re.search(r'[\u4e00-\u9fff]', query) is not None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 全局变量
doc_store = None

def init_doc_store():
    """初始化全局DocumentStore实例"""
    global doc_store
    api_key = os.getenv('ARK_API_KEY', '')
    base_url = os.getenv('ARK_BASE_URL', '')
    model_name = os.getenv('ARK_EMBEDDING_MODEL', '')
    
    if api_key:
        logger.info(f"ARK_API_KEY 已配置，使用嵌入模型: {model_name}")
        doc_store = DocumentStore(
            api_key=api_key,
            base_url=base_url,
            model_name=model_name
        )
    else:
        logger.warning("ARK_API_KEY 未配置")

# 注册路由
def register_routes():
    # 注册上传相关路由
    register_upload_routes(app, doc_store, UPLOAD_FOLDER)
    
    # 注册聊天相关路由
    register_chat_routes(app)
    
    # 注册文档聊天相关路由
    register_doc_chat_routes(app, doc_store)
    
    # 注册测试路由
    register_test_routes(app)  # 添加新的路由注册
    
    # 测试端点
@app.route('/api/test')
def test():
    """测试端点"""
    try:
        return jsonify({
            'status': 'ok',
            'message': 'Flask 服务器正在运行',
            'version': '1.0.0',
            'env': os.getenv('NODE_ENV', 'development'),
            'ark_api': '已配置' if os.getenv('ARK_API_KEY') else '未配置'
        })
    except Exception as e:
        logger.error(f"测试端点错误: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# 请求前处理
@app.before_request
def log_request_info():
    # 记录请求信息，包括客户端 IP
    logger.info(f"请求来自: {request.remote_addr}")
    logger.info(f"X-Forwarded-For: {request.headers.get('X-Forwarded-For')}")
    if request.path != '/api/test':  # 忽略测试端点的日志
        logger.info(f"收到请求: {request.method} {request.path}")

@app.errorhandler(Exception)
def handle_error(error):
    print(f"错误: {str(error)}")
    return jsonify({
        "error": str(error),
        "type": type(error).__name__
    }), getattr(error, 'code', 500)

@app.after_request
def after_request(response):
    # 检查是否已经设置了 CORS 头
    if 'Access-Control-Allow-Origin' not in response.headers:
        origin = request.headers.get('Origin')
        allowed_origins = ["http://localhost:5173", "http://192.168.1.11:5173", "https://joytianya.github.io", "https://mini-chatbot-backend.onrender.com"]
        if origin in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With,Origin,X-Title,HTTP-Referer,x-title,http-referer,content-type,authorization,accept,x-requested-with,origin')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    # 记录CORS响应头
    cors_headers = {}
    for header in response.headers:
        if header[0].lower().startswith('access-control'):
            cors_headers[header[0]] = header[1]
    
    if cors_headers:
        logger.debug(f"CORS响应头: {cors_headers}")
    
    # 对于OPTIONS请求，确保返回正确的状态码和头部
    if request.method == 'OPTIONS':
        logger.info("处理OPTIONS请求，添加CORS响应头")
        # 确保即使客户端发送的是自定义头部名称的小写版本，我们也能正确处理
        headers_lower = [h.lower() for h in request.headers.keys()]
        
        # 记录客户端实际的请求头
        logger.debug(f"OPTIONS请求头: {dict(request.headers)}")
        
        # 总是添加所有可能的头部变种，确保兼容性
        if 'Access-Control-Allow-Headers' not in response.headers:
            all_headers = 'Content-Type,Authorization,Accept,X-Requested-With,Origin,X-Title,HTTP-Referer,http-referer,x-title,content-type,authorization,accept,x-requested-with,origin'
            response.headers.add('Access-Control-Allow-Headers', all_headers)
        
        response.headers.add('Access-Control-Max-Age', '3600')  # 缓存预检请求结果1小时
    
    return response

# 配置调度器
class Config:
    SCHEDULER_API_ENABLED = True
    SCHEDULER_TIMEZONE = "Asia/Shanghai"

app.config.from_object(Config())

# 初始化调度器
scheduler = APScheduler()
scheduler.init_app(app)

# 定义更新searx实例的任务
def update_searx_instances():
    try:
        logger.info("开始更新SearX实例列表...")
        parser = SearxSpaceParser()
        parser.parse_and_save_instances()
        logger.info("SearX实例列表更新完成")
    except Exception as e:
        logger.error(f"更新SearX实例列表失败: {str(e)}")

# 添加定时任务
@scheduler.task('interval', id='update_searx_instances', hours=12, misfire_grace_time=900)
def scheduled_update_searx_instances():
    update_searx_instances()

# 获取本机局域网 IP 地址
def get_local_ip():
    """获取本机局域网 IP 地址"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# 应用初始化
def init_app():
    # 初始化DocumentStore
    init_doc_store()
    
    # 注册路由
    register_routes()

# 启动调度器
scheduler.start()

# 主函数
if __name__ == '__main__':
    # 初始化应用
    init_app()
    
    # 启动服务器
    port = int(os.environ.get('PORT', 5001))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True,  # 启用调试模式，支持热更新
        use_reloader=True  # 启用重载器
    )