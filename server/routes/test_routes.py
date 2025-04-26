# -*- coding: utf-8 -*-
import json
from flask import jsonify, request, Response, stream_with_context
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)

def register_test_routes(app):
    """注册测试相关路由"""
    
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