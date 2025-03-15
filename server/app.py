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

# 配置日志
logger = logging.getLogger(__name__)

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

# 创建处理器并设置格式化器
handler = StreamHandler()
handler.setFormatter(CustomFormatter(
    fmt='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
))

# 配置根日志记录器
root_logger = logging.getLogger()
# 移除所有现有的处理器
for h in root_logger.handlers[:]:
    root_logger.removeHandler(h)
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)

# 配置应用日志记录器
logger.setLevel(logging.INFO)

# 自定义日志格式
def log_separator(length=80):
    return "-" * length

class CustomLogger:
    @staticmethod
    def request(method, path, data=None):
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
        separator = f"""响应详情:
用户问题: {query}
完整响应:
{full_response}
{log_separator()}"""
        
        logger.info(
            "生成响应完成",
            extra={'separator': separator}
        )

# 加载环境变量
load_dotenv()
if os.getenv('ARK_API_KEY'):
    logger.info("ARK_API_KEY 已配置")
else:
    logger.warning("ARK_API_KEY 未配置")
app = Flask(__name__)
# 配置 CORS，明确指定允许的方法和头部
CORS(app, 
    resources={
        r"/*": {
            "origins": [
                "http://localhost:5173", 
                "https://joytianya.github.io",
                "https://mini-chatbot-backend.onrender.com"
            ],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Accept"],
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
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}
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

def update_doc_store(api_key, base_url, model_name):
    """更新全局DocumentStore实例的配置"""
    global doc_store
    doc_store = DocumentStore(
        api_key=api_key,
        base_url=base_url,
        model_name=model_name
    )

@app.route('/upload', methods=['POST'])
def upload_file():
    logger.info("开始处理文件上传请求")
    if 'documents' not in request.files:
        logger.error("请求中未包含文件")
        return jsonify({'error': 'No file part'}), 400
    
    # 获取embedding相关参数
    embedding_base_url = request.form.get('embedding_base_url', '默认的embedding_base_url')
    embedding_api_key = request.form.get('embedding_api_key', '默认的embedding_api_key') 
    embedding_model_name = request.form.get('embedding_model_name', '默认的embedding_model_name')
    sensitive_info_protected = request.form.get('sensitive_info_protected', 'false') == 'true'
    logger.info(f"接收到的embedding配置 - model: {embedding_model_name}, base_url: {embedding_base_url}")
    logger.info(f"敏感信息保护: {'启用' if sensitive_info_protected else '禁用'}")

    # 更新全局DocumentStore实例
    try:
        update_doc_store(
            api_key=embedding_api_key,
            base_url=embedding_base_url,
            model_name=embedding_model_name
        )
        logger.info("DocumentStore实例更新成功")
    except Exception as e:
        logger.error(f"更新DocumentStore实例失败: {str(e)}")
        return jsonify({'error': '配置更新失败'}), 500
    
    file = request.files['documents']
    if file.filename == '':
        logger.error("未选择文件")
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            # 检查文件名是否包含_masked后缀，这表明它是经过掩码处理的
            is_masked_file = '_masked.' in filename
            logger.info(f"接收到的文件: {filename}, 是否为掩码处理后的文件: {is_masked_file}")
            
            # 读取文件内容并检查
            file_content = file.read().decode('utf-8', errors='ignore')
            file_size = len(file_content)
            content_preview = file_content[:200] + '...' if len(file_content) > 200 else file_content
            logger.info(f"文件内容预览: {content_preview}")
            
            # 检查是否包含手机号码
            phone_pattern = re.compile(r'\b1\d{10}\b')
            phone_matches = phone_pattern.findall(file_content)
            if phone_matches:
                logger.warning(f"文件中包含未掩码的手机号码: {phone_matches[:3]}")
                if sensitive_info_protected:
                    logger.error("警告：敏感信息保护已启用，但文件中仍包含未掩码的手机号码")
            
            # 重置文件指针
            file.seek(0)
            
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            logger.info(f"准备保存文件: {filename}, 大小: {file_size} bytes")
            file.save(file_path)
            logger.info(f"文件已保存到: {file_path}")
            
            # 使用全局doc_store处理文件
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

@app.before_request
def log_request_info():
    # 记录请求信息，包括客户端 IP
    logger.info(f"请求来自: {request.remote_addr}")
    logger.info(f"X-Forwarded-For: {request.headers.get('X-Forwarded-For')}")
    if request.path != '/api/test':  # 忽略测试端点的日志
        logger.info(f"收到请求: {request.method} {request.path}")

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    # 定义响应头
    headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'  # 禁用 Nginx 缓冲
    }

    # 处理 OPTIONS 预检请求
    if request.method == 'OPTIONS':
        logger.debug("处理 OPTIONS 请求")
        return ('', 204, headers)

    try:
        data = request.json
        logger.info(f"收到的请求数据: {json.dumps(data, ensure_ascii=False)}")
        
        if not data:
            raise ValueError("请求体为空")
        
        if 'messages' not in data:
            raise ValueError("缺少必需的 'messages' 字段")
        
        messages = data['messages']
        if not isinstance(messages, list):
            raise ValueError("'messages' 必须是一个数组")
        
        if not messages:
            raise ValueError("'messages' 数组不能为空")

        base_url = data.get('base_url', '默认的base_url')
        api_key = data.get('api_key', '默认的api_key')
        model_name = data.get('model_name', '默认的model_name')
        is_deep_research = data.get('deep_research', False)  # 获取深度研究模式标志
        is_web_search = data.get('web_search', False)  # 获取联网搜索标志

        logger.info(f"当前模式: {'深度研究' if is_deep_research else '普通对话'}, 联网搜索: {'开启' if is_web_search else '关闭'}")

        # 如果启用了联网搜索，获取web搜索结果
        if is_web_search:
            cur_date = datetime.now().strftime("%Y-%m-%d")
            user_query = messages[-1]['content']
            # 使用事件循环运行异步函数
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            web_search_results, search_results_str, search_result_urls = loop.run_until_complete(get_web_kg(user_query))
            loop.close()
            
            # 将web搜索结果添加到用户消息中
            if is_chinese(user_query):
                web_context = search_answer_zh_template.format(search_results=search_results_str, question=user_query, cur_date=cur_date)
            else:
                web_context = search_answer_en_template.format(search_results=search_results_str, question=user_query, cur_date=cur_date)

            messages[-1]['content'] = web_context
            logger.info(f"添加了联网搜索结果: {web_context}")
            logger.info(f"添加了联网搜索结果urls: {search_result_urls}")
        #print(messages)
        if is_deep_research:
            # 使用 JinaChatAPI 进行深度研究
            chat = JinaChatAPI()
            response = chat.stream_chat(messages)
        else:
            # 使用 OpenAI API 进行普通对话
            client = OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=True
            )

        def generate():
            full_response = []
            try:
                #print(response)
                for chunk in response:
                    logger.debug("收到 chunk: %s", chunk)
                    if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                        if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                            content = chunk.choices[0].delta.reasoning_content
                            yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': chunk.choices[0].delta.reasoning_content}}]})}\n\n".encode('utf-8')
                            full_response.append(content)
                        elif hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk.choices[0].delta.content}}]})}\n\n".encode('utf-8')
                            full_response.append(content)
                    else:
                        logger.error("收到 chunk 中没有 choices 字段")
                if is_web_search:
                    yield f"data: {json.dumps({'choices': [{'delta': {'content': f'\n\n相关网页链接：{search_result_urls}\n'}}]})}\n\n".encode('utf-8')

                yield b"data: [DONE]\n\n"
                CustomLogger.response_complete(messages[-1]['content'], ''.join(full_response))
            except Exception as e:
                logger.error("生成响应流时出错: %s", str(e))
                yield f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
                yield b"data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers=headers,
            direct_passthrough=True
        )
    except Exception as e:
        error_msg = f"处理请求时出错: {str(e)}"
        logger.error(error_msg)
        return jsonify({'error': error_msg}), 500, headers

@app.route('/api/chat_with_doc', methods=['POST', 'OPTIONS'])
def chat_with_doc():
    headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'  # 禁用 Nginx 缓冲
    }

    # 处理 OPTIONS 预检请求
    if request.method == 'OPTIONS':
        logger.debug("处理 OPTIONS 请求")
        return ('', 204, headers)

    try:
        data = request.json
        CustomLogger.request(request.method, request.path, data)
        
        # 检查必要参数
        required_params = ['messages', 'base_url', 'api_key', 'model_name', 
                         'embedding_base_url', 'embedding_api_key', 'embedding_model_name']
        for param in required_params:
            if not data.get(param):
                raise ValueError(f'Missing required parameter: {param}')
        
        messages = data['messages']
        base_url = data['base_url']
        api_key = data['api_key']
        model_name = data['model_name']
        embedding_base_url = data['embedding_base_url']
        embedding_api_key = data['embedding_api_key']
        embedding_model_name = data['embedding_model_name']
        document_id = data.get('document_id')  # 获取document_id参数
        is_deep_research = data.get('deep_research', False)  # 获取深度研究模式标志
        is_web_search = data.get('web_search', False)  # 获取联网搜索标志
        
        # 打印调试信息
        logger.info("收到的参数:")
        logger.info(f"base_url: {base_url}")
        logger.info(f"api_key: {api_key[:5]}***") # 只显示前5位
        logger.info(f"model_name: {model_name}")
        logger.info(f"embedding_base_url: {embedding_base_url}")
        logger.info(f"embedding_api_key: {embedding_api_key[:5]}***")
        logger.info(f"embedding_model_name: {embedding_model_name}")
        logger.info(f"document_id: {document_id}")
        logger.info(f"消息数量: {len(messages)}")
        logger.info(f"深度研究模式: {'开启' if is_deep_research else '关闭'}")
        logger.info(f"联网搜索: {'开启' if is_web_search else '关闭'}")
        
        # 如果启用了联网搜索，获取web搜索结果
        if is_web_search:
            cur_date = datetime.now().strftime("%Y-%m-%d")
            user_query = messages[-1]['content']
            # 使用事件循环运行异步函数
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            web_search_results, search_results_str, search_result_urls_str = loop.run_until_complete(get_web_kg(user_query))
            loop.close()
            
            # 将web搜索结果添加到用户消息中
            if is_chinese(user_query):
                web_context = search_answer_zh_template.format(search_results=search_results_str, question=user_query, cur_date=cur_date)
            else:
                web_context = search_answer_en_template.format(search_results=search_results_str, question=user_query, cur_date=cur_date)
            
            messages[-1]['content'] = web_context
            logger.info(f"添加了联网搜索结果: {web_context}")

        # 检查doc_store是否为None，如果是则重新初始化
        global doc_store
        if doc_store is None:
            logger.info("doc_store为空，重新初始化...")
            update_doc_store(
                api_key=embedding_api_key,
                base_url=embedding_base_url,
                model_name=embedding_model_name
            )
            if doc_store is None:
                raise ValueError('Failed to initialize doc_store')

        # 使用doc_store检索相关文档，传入document_id参数
        relevant_docs = doc_store.search(messages[-1]['content'], k=30, document_id=document_id)
        if not relevant_docs:
            logger.warning(f"在文档 {document_id or '所有文档'} 中未找到相关内容")
        
        # 构建并记录上下文
        context = "\n\n".join([f"文档片段 {i+1}:\n{doc.page_content}" for i, doc in enumerate(relevant_docs)])
        messages[-1]['content'] = messages[-1]['content'] + "\n\n" + context
        CustomLogger.chat_completion(messages[-1]['content'], len(relevant_docs), context)
        
        # 构建系统提示词
        system_prompt = f"""你好!我是一个专业的AI助手,很高兴为你提供帮助。我会仔细阅读以下参考文档来回答你的问题:

在回答过程中,我会:
- 优先使用文档中的信息进行回答
- 用简洁清晰的语言表达
- 使用 Markdown 格式来组织回答，包括标题、列表、代码块等

如果文档中没有找到相关信息,我会坦诚地告诉你。请问有什么我可以帮你的吗?"""
        if messages[0]['role'] == 'system':
            messages[0]['content'] = system_prompt
        else:
            messages.insert(0, {'role': 'system', 'content': system_prompt})
    

        # 根据深度研究模式选择不同的API
        if is_deep_research:
            # 使用 JinaChatAPI 进行深度研究
            logger.info("使用 JinaChatAPI 进行深度研究")
            chat = JinaChatAPI()
            response = chat.stream_chat(messages)
        else:
            # 使用 OpenAI API 进行普通对话
            logger.info("使用 OpenAI API 进行普通对话")
            client = OpenAI(api_key=api_key, base_url=base_url)
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=True
            )
        
        def generate():
            full_response = []
            try:
                # 发送初始推理内容
                yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': '正在分析相关文档...\n'}}]})}\n\n".encode('utf-8')
                yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': f'找到 {len(relevant_docs)} 个相关文档片段。\n'}}]})}\n\n".encode('utf-8')
                
                # 可以选择性地显示找到的文档片段
                if relevant_docs:
                    # 发送相关文档内容的标题
                    yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': f'相关文档内容：\n'}}]})}\n\n".encode('utf-8')
                    
                    # 遍历并发送每个文档片段
                    for i, doc in enumerate(relevant_docs):
                        # 处理可能的None值
                        content = doc.page_content if doc and hasattr(doc, 'page_content') else ''
                        if content:
                            yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': f'片段 {i+1}：{content}\n'}}]})}\n\n".encode('utf-8')
                    
                    # 发送过渡提示
                    yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': f'\n基于以上文档回答：\n'}}]})}\n\n".encode('utf-8')

                # 调用 API 进行流式响应
                logger.debug(f"调用 {'JinaChatAPI' if is_deep_research else 'OpenAI API'}")
                for chunk in response:
                    logger.debug("收到 chunk: %s", chunk)
                    if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                        if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                            content = chunk.choices[0].delta.reasoning_content
                            yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': chunk.choices[0].delta.reasoning_content}}]})}\n\n".encode('utf-8')
                            full_response.append(content)
                        elif hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk.choices[0].delta.content}}]})}\n\n".encode('utf-8')
                            full_response.append(content)
                    else:
                        logger.error("收到 chunk 中没有 choices 字段")
                if is_web_search:
                    yield f"data: {json.dumps({'choices': [{'delta': {'content': f'\n\n相关网页链接：{search_result_urls_str}\n'}}]})}\n\n".encode('utf-8')

                yield b"data: [DONE]\n\n"
                CustomLogger.response_complete(messages[-1]['content'], ''.join(full_response))
            except Exception as e:
                logger.error("生成响应流时出错: %s", str(e))
                yield f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
                yield b"data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers=headers,
            direct_passthrough=True
        )

    except Exception as e:
        logger.error(f"处理请求时出错: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(Exception)
def handle_error(error):
    print(f"错误: {str(error)}")
    return jsonify({
        "error": str(error),
        "type": type(error).__name__
    }), getattr(error, 'code', 500)

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

# 启动调度器
scheduler.start()

if __name__ == '__main__':
    print(os.environ.get('PORT'))
    port = int(os.environ.get('PORT', 5001))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True,  # 启用调试模式，支持热更新
        use_reloader=True  # 启用重载器
    )