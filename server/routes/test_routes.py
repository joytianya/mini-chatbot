# -*- coding: utf-8 -*-
import json
from flask import jsonify, request, Response, stream_with_context
from openai import OpenAI
import logging
import sys
import os
import time

# 添加utils目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.openrouter_test import OpenRouterTest

logger = logging.getLogger(__name__)

def register_test_routes(app):
    """注册测试相关路由"""
    
    # 创建OpenRouterTest实例
    openrouter_tester = None
    try:
        openrouter_tester = OpenRouterTest()
        logger.info("成功初始化OpenRouterTest实例")
    except Exception as e:
        logger.error(f"初始化OpenRouterTest失败: {str(e)}")
    
    @app.route('/api/test', methods=['GET'])
    def test_api():
        """测试API是否正常工作"""
        return jsonify({
            "status": "success",
            "message": "API服务正常运行",
            "version": "1.0.0",
            "timestamp": str(int(time.time()))
        })
    
    @app.route('/api/test_utf8', methods=['GET', 'POST'])
    def test_utf8():
        """测试 UTF-8 编码响应"""
        # 简单的中文响应测试
        response_data = {
            "status": "success",
            "message": "UTF-8 编码测试成功！",
            "chinese_text": "你好，世界！这是一个测试。",
            "emoji": "🚀✨🎉",
            "numbers": ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
            "request_method": request.method
        }
        
        if request.method == 'POST' and request.is_json:
            # 如果是 POST 请求，将请求体内容包含在响应中
            request_data = request.json
            response_data["echo"] = request_data
            
        return jsonify(response_data)
    
    @app.route('/api/test_openrouter', methods=['POST'])
    def test_openrouter():
        """测试 OpenRouter API 连接"""
        try:
            # 获取请求数据
            data = request.json
            
            if not data:
                return jsonify({"error": "请求体为空"}), 400
            
            # 获取必要参数
            api_key = data.get('api_key')
            base_url = data.get('base_url', 'https://openrouter.ai/api/v1')
            model = data.get('model', 'openai/gpt-3.5-turbo')
            messages = data.get('messages', [])
            stream = data.get('stream', False)
            
            if not api_key:
                return jsonify({"error": "缺少 API 密钥"}), 400
            
            if not messages:
                return jsonify({"error": "缺少消息内容"}), 400
            
            # 初始化 OpenAI 客户端
            client = OpenAI(
                base_url=base_url,
                api_key=api_key
            )
            
            # 设置额外的请求头
            extra_headers = {
                "HTTP-Referer": request.headers.get('Origin', 'https://mini-chatbot.example.com'),
                "X-Title": "Mini-Chatbot Test"
            }
            
            # 记录请求信息
            logger.info(f"测试 OpenRouter API，模型: {model}, 流式: {stream}")
            
            # 发送请求到 OpenRouter
            if stream:
                # 使用流式响应
                def generate():
                    try:
                        for chunk in client.chat.completions.create(
                            extra_headers=extra_headers,
                            model=model,
                            messages=messages,
                            stream=True
                        ):
                            if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                                content = chunk.choices[0].delta.content
                                data = json.dumps({'choices': [{'delta': {'content': content}}]}, ensure_ascii=False)
                                yield f"data: {data}\n\n".encode('utf-8')
                        
                        yield b"data: [DONE]\n\n"
                        
                    except Exception as e:
                        logger.error(f"OpenRouter 流式请求错误: {str(e)}")
                        error_data = json.dumps({'error': str(e)}, ensure_ascii=False)
                        yield f"data: {error_data}\n\n".encode('utf-8')
                        yield b"data: [DONE]\n\n"
                
                return Response(
                    stream_with_context(generate()),
                    mimetype='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Accel-Buffering': 'no'
                    }
                )
            else:
                # 使用普通响应
                try:
                    completion = client.chat.completions.create(
                        extra_headers=extra_headers,
                        model=model,
                        messages=messages
                    )
                    
                    response_data = {
                        "status": "success",
                        "model": model,
                        "content": completion.choices[0].message.content,
                        "usage": {
                            "prompt_tokens": completion.usage.prompt_tokens,
                            "completion_tokens": completion.usage.completion_tokens,
                            "total_tokens": completion.usage.total_tokens
                        }
                    }
                    
                    return jsonify(response_data)
                
                except Exception as e:
                    logger.error(f"OpenRouter 请求错误: {str(e)}")
                    return jsonify({"error": str(e)}), 500
        
        except Exception as e:
            logger.error(f"处理 OpenRouter 测试请求时出错: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/direct_openrouter/test', methods=['GET'])
    def test_direct_openrouter_connection():
        """测试与OpenRouter的直接连接，使用.env中的配置"""
        if not openrouter_tester:
            return jsonify({
                "success": False,
                "error": "OpenRouterTest实例未初始化，可能是缺少必要的环境变量"
            }), 500
        
        try:
            result = openrouter_tester.test_connection()
            return jsonify(result)
        except Exception as e:
            logger.error(f"测试OpenRouter连接时出错: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    @app.route('/api/direct_openrouter/test_chinese', methods=['GET'])
    def test_direct_openrouter_chinese():
        """测试OpenRouter的中文响应能力"""
        if not openrouter_tester:
            return jsonify({
                "success": False,
                "error": "OpenRouterTest实例未初始化，可能是缺少必要的环境变量"
            }), 500
        
        try:
            result = openrouter_tester.test_chinese()
            return jsonify(result)
        except Exception as e:
            logger.error(f"测试OpenRouter中文响应时出错: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    @app.route('/api/direct_openrouter/chat', methods=['POST'])
    def direct_openrouter_chat():
        """发送聊天请求到OpenRouter，使用.env中的配置"""
        if not openrouter_tester:
            return jsonify({
                "success": False,
                "error": "OpenRouterTest实例未初始化，可能是缺少必要的环境变量"
            }), 500
        
        try:
            data = request.json
            if not data:
                return jsonify({"error": "请求体为空"}), 400
            
            messages = data.get('messages', [])
            if not messages:
                return jsonify({"error": "缺少消息内容"}), 400
            
            temperature = float(data.get('temperature', 0.7))
            max_tokens = int(data.get('max_tokens', 1000))
            stream = bool(data.get('stream', False))
            
            if stream:
                # 使用流式响应
                def generate():
                    try:
                        # 使用自定义流式请求
                        messages_copy = messages.copy()
                        result = openrouter_tester.chat_completion(
                            messages=messages_copy,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            stream=True
                        )
                        
                        if not result.get("success", False):
                            error_data = json.dumps({'error': result.get("error", "未知错误")}, ensure_ascii=False)
                            yield f"data: {error_data}\n\n".encode('utf-8')
                            yield b"data: [DONE]\n\n"
                            return
                        
                        # 直接返回完整的内容和思考过程
                        content = result.get("data", {}).get("content", "")
                        reasoning = result.get("data", {}).get("reasoning", "")
                        
                        # 模拟流式输出思考过程
                        if reasoning:
                            for i in range(0, len(reasoning), 10):
                                chunk = reasoning[i:i+10]
                                data = json.dumps({'choices': [{'delta': {'reasoning_content': chunk}}]}, ensure_ascii=False)
                                yield f"data: {data}\n\n".encode('utf-8')
                        
                        # 添加一个空行分隔思考过程和内容
                        if reasoning and content:
                            yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': '\n\n'}}]}, ensure_ascii=False)}\n\n".encode('utf-8')
                        
                        # 模拟流式输出内容
                        if content:
                            for i in range(0, len(content), 10):
                                chunk = content[i:i+10]
                                data = json.dumps({'choices': [{'delta': {'content': chunk}}]}, ensure_ascii=False)
                                yield f"data: {data}\n\n".encode('utf-8')
                        
                        yield b"data: [DONE]\n\n"
                    
                    except Exception as e:
                        logger.error(f"直接OpenRouter流式请求错误: {str(e)}")
                        error_data = json.dumps({'error': str(e)}, ensure_ascii=False)
                        yield f"data: {error_data}\n\n".encode('utf-8')
                        yield b"data: [DONE]\n\n"
                
                return Response(
                    stream_with_context(generate()),
                    mimetype='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Accel-Buffering': 'no'
                    }
                )
            else:
                # 普通响应
                result = openrouter_tester.chat_completion(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=False
                )
                
                return jsonify(result)
            
        except Exception as e:
            logger.error(f"处理直接OpenRouter聊天请求时出错: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    @app.route('/api/direct_openrouter/stream_test', methods=['GET'])
    def test_direct_openrouter_stream():
        """测试OpenRouter的流式响应能力"""
        if not openrouter_tester:
            return jsonify({
                "success": False,
                "error": "OpenRouterTest实例未初始化，可能是缺少必要的环境变量"
            }), 500
        
        try:
            # 使用流式响应
            def generate():
                try:
                    result = openrouter_tester.test_stream()
                    
                    if not result.get("success", False):
                        error_data = json.dumps({'error': result.get("error", "未知错误")}, ensure_ascii=False)
                        yield f"data: {error_data}\n\n".encode('utf-8')
                        yield b"data: [DONE]\n\n"
                        return
                    
                    # 直接返回完整的内容和思考过程
                    content = result.get("data", {}).get("content", "")
                    reasoning = result.get("data", {}).get("reasoning", "")
                    
                    # 模拟流式输出思考过程
                    if reasoning:
                        for i in range(0, len(reasoning), 10):
                            chunk = reasoning[i:i+10]
                            data = json.dumps({'choices': [{'delta': {'reasoning_content': chunk}}]}, ensure_ascii=False)
                            yield f"data: {data}\n\n".encode('utf-8')
                    
                    # 添加一个空行分隔思考过程和内容
                    if reasoning and content:
                        yield f"data: {json.dumps({'choices': [{'delta': {'reasoning_content': '\n\n'}}]}, ensure_ascii=False)}\n\n".encode('utf-8')
                    
                    # 模拟流式输出内容
                    if content:
                        for i in range(0, len(content), 10):
                            chunk = content[i:i+10]
                            data = json.dumps({'choices': [{'delta': {'content': chunk}}]}, ensure_ascii=False)
                            yield f"data: {data}\n\n".encode('utf-8')
                    
                    yield b"data: [DONE]\n\n"
                
                except Exception as e:
                    logger.error(f"OpenRouter 流式测试错误: {str(e)}")
                    error_data = json.dumps({'error': str(e)}, ensure_ascii=False)
                    yield f"data: {error_data}\n\n".encode('utf-8')
                    yield b"data: [DONE]\n\n"
            
            return Response(
                stream_with_context(generate()),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                }
            )
            
        except Exception as e:
            logger.error(f"测试OpenRouter流式响应时出错: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500 