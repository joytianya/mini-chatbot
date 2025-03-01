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

# 配置日志
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

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
    fmt='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
))
logger.addHandler(handler)

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
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Accept"],
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

# 初始化文档存储和 OpenAI 客户端
doc_store = DocumentStore()
client = OpenAI(
    api_key=os.getenv("ARK_API_KEY"),  # 从环境变量读取 ARK_API_KEY
    base_url=os.getenv("ARK_BASE_URL"),  # 从环境变量读取 ARK_BASE_URL
)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'documents' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['documents']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # 只处理上传的文件
            document_id = doc_store.process_single_file(file_path)
            if document_id:
                return jsonify({
                    'message': '文件上传并处理成功',
                    'document_id': document_id
                })
            else:
                return jsonify({'error': '文件处理失败'}), 500
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

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

        model = data.get('model', 'deepseek-r1-250120')
        query = messages[-1]['content']

        def generate():
            full_response = []
            try:
                # 调用 OpenAI API 进行流式响应
                logger.debug("调用 OpenAI API")
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    stream=True
                )

                for chunk in response:
                    logger.debug("收到 chunk: %s", chunk)
                    if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                        content = chunk.choices[0].delta.reasoning_content
                        yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': chunk.choices[0].delta.reasoning_content}}]})}\n\n".encode('utf-8')
                        full_response.append(content)
                    elif hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk.choices[0].delta.content}}]})}\n\n".encode('utf-8')
                        full_response.append(content)

                yield b"data: [DONE]\n\n"
                CustomLogger.response_complete(query, ''.join(full_response))
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
        messages = data['messages']
        model = data.get('model', 'deepseek-r1-250120')
        query = messages[-1]['content']
        
        # 检索相关文档
        relevant_docs = doc_store.search(query)
        
        # 构建并记录上下文
        context = "\n\n".join([f"文档片段 {i+1}:\n{doc.page_content}" for i, doc in enumerate(relevant_docs)])
        CustomLogger.chat_completion(query, len(relevant_docs), context)
        
        # 构建系统提示词
        system_prompt = f"""你好!我是一个专业的AI助手,很高兴为你提供帮助。我会仔细阅读以下参考文档来回答你的问题:

参考文档:
{context}

在回答过程中,我会:
- 优先使用文档中的信息进行回答
- 用简洁清晰的语言表达
- 使用 Markdown 格式来组织回答，包括标题、列表、代码块等

如果文档中没有找到相关信息,我会坦诚地告诉你。请问有什么我可以帮你的吗?"""
        
        # 更新消息列表中的系统消息
        if messages[0]['role'] == 'system':
            messages[0]['content'] = system_prompt
        else:
            messages.insert(0, {"role": "system", "content": system_prompt})
        
        def generate():
            full_response = []
            try:
                # 发送初始推理内容
                yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': '正在分析相关文档...\n'}}]})}\n\n".encode('utf-8')
                yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': f'找到 {len(relevant_docs)} 个相关文档片段。\n'}}]})}\n\n".encode('utf-8')
                
                # 可以选择性地显示找到的文档片段
                if relevant_docs:
                    yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': '相关文档内容：\n'}}]})}\n\n".encode('utf-8')
                    for i, doc in enumerate(relevant_docs):
                        yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': f'片段 {i+1}：{doc.page_content}\n'}}]})}\n\n".encode('utf-8')
                    yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': '\n基于以上文档回答：\n'}}]})}\n\n".encode('utf-8')

                # 调用 OpenAI API 进行流式响应
                logger.debug("调用 OpenAI API")
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    stream=True
                )

                for chunk in response:
                    logger.debug("收到 chunk: %s", chunk)
                    if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                        content = chunk.choices[0].delta.reasoning_content
                        yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': chunk.choices[0].delta.reasoning_content}}]})}\n\n".encode('utf-8')
                        full_response.append(content)
                    elif hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk.choices[0].delta.content}}]})}\n\n".encode('utf-8')
                        full_response.append(content)

                yield b"data: [DONE]\n\n"
                CustomLogger.response_complete(query, ''.join(full_response))
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

if __name__ == '__main__':
    host = get_local_ip()
    port = 5001
    print(f"\n=== 服务器启动 ===")
    print(f"本地访问: http://127.0.0.1:{port}")
    print(f"局域网访问: http://{host}:{port}")
    print(f"=================\n")
    
    app.run(
        debug=True, 
        port=port,
        host='0.0.0.0',  # 允许外部访问
        threaded=True,   # 启用多线程
        ssl_context=None  # 禁用 SSL
    )  