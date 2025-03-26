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

# 加载环境变量
load_dotenv()

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
                "https://joytianya.github.io",
                "https://mini-chatbot-backend.onrender.com"
            ],
            "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization", "Accept", "X-Requested-With", "Origin"],
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

def update_doc_store(api_key, base_url, model_name):
    """更新全局DocumentStore实例的配置"""
    global doc_store
    logger.info(f"更新DocumentStore配置，使用嵌入模型: {model_name}")
    doc_store = DocumentStore(
        api_key=api_key,
        base_url=base_url,
        model_name=model_name
    )

# 注册路由
def register_routes():
    # 注册上传相关路由
    register_upload_routes(app, doc_store, UPLOAD_FOLDER)
    
    # 注册聊天相关路由
    register_chat_routes(app)
    
    # 注册文档聊天相关路由
    register_doc_chat_routes(app, doc_store)
    
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
        allowed_origins = ["http://localhost:5173", "https://joytianya.github.io", "https://mini-chatbot-backend.onrender.com"]
        if origin in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
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