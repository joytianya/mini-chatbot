from flask import request, jsonify, Response, stream_with_context
import json
import logging
import asyncio
from datetime import datetime
from openai import OpenAI
from jina import JinaChatAPI
from web_kg import get_web_kg
from utils.text_utils import is_chinese
from utils.logger_utils import CustomLogger
from system_prompts import search_answer_zh_template, search_answer_en_template

logger = logging.getLogger(__name__)

def register_chat_routes(app):
    """注册聊天相关路由"""
    
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
            search_result_urls_str = ""
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
                logger.info(f"添加了联网搜索结果urls: {search_result_urls_str}")

            # 根据模式选择不同的API
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

            # 生成流式响应
            def generate():
                full_response = []
                try:
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
                    
                    # 如果启用了联网搜索，添加网页链接
                    if is_web_search and search_result_urls_str:
                        content_str = '\n\n相关网页链接：' + search_result_urls_str + '\n'
                        yield f"data: {json.dumps({'choices': [{'delta': {'content': content_str}}]})}\n\n".encode('utf-8')

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