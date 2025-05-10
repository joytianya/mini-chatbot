from flask import request, jsonify, Response, stream_with_context
import json
import logging
import asyncio
from datetime import datetime
from httpx import stream
from openai import OpenAI
from jina import JinaChatAPI
from web_kg import get_web_kg
from utils.text_utils import is_chinese
from utils.logger_utils import CustomLogger
from system_prompts import search_answer_zh_template, search_answer_en_template

logger = logging.getLogger(__name__)

def extract_search_query(query: str) -> str:
    """
    使用大模型分析用户query背后的搜索意图
    提取搜索关键词, 解析成字典
    {
    "query": "OpenAI最近有什么新进展",
    "search_intent": "GPT-4 最新进展 OpenAI新产品发布"
    }
    """
    try: 
        # 去掉```json
        query = query.replace('```json', '').replace('```', '')
        search_query = json.loads(query)
        return search_query["search_intent"]
    except Exception as e:
        logger.error(f"解析搜索意图失败: {str(e)}, query: {query}")
        return None

    

def get_search_intent(query: str, client: OpenAI, model_name: str) -> str:
    """
    使用大模型分析用户query背后的搜索意图
    
    Args:
        query: 用户的原始查询
    
    Returns:
        str: 优化后的搜索查询语句
    """
    try:
        
        # 构建提示词
        if is_chinese(query):
            prompt = f"""请分析用户的问题"{query}"背后的真实搜索意图,生成1-2个用于搜索引擎的关键词组合。
要求:
1. 提取核心概念和关键词
2. 考虑问题的上下文和潜在目的
3. 返回最相关的搜索词组合
4. 只返回搜索词,不要其他解释

示例:
用户问题:"OpenAI最近有什么新进展"
搜索词:"GPT-4 最新进展 OpenAI新产品发布"
输出格式：
```json{{
    "query": "OpenAI最近有什么新进展",
    "search_intent": "GPT-4 最新进展 OpenAI新产品发布"
}}
"""
        else:
            prompt = f"""Analyze the user's question "{query}" and generate 1-2 keyword combinations for search engines.
Requirements:
1. Extract core concepts and keywords
2. Consider context and potential purpose
3. Return most relevant search terms
4. Return only search terms, no explanation

Example:
Question: "What's new with OpenAI?"
Search terms: "GPT-4 latest developments OpenAI new product releases"
Output format:
```json{{
    "query": "What's new with OpenAI?",
    "search_intent": "GPT-4 latest developments OpenAI new product releases"
}}
"""

        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "你是一个搜索意图分析专家"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        search_intent = response.choices[0].message.content.strip()
        logger.info(f"原始查询: {query} -> 搜索意图: {search_intent}")
        search_query = extract_search_query(search_intent)
        if search_query:
            logger.info(f"提取搜索意图成功: {search_query}")
            return search_query
        else:
            logger.info(f"提取搜索意图失败: {search_intent}")
            return query
        
    except Exception as e:
        logger.error(f"获取搜索意图失败: {str(e)}, query: {query}")
        return query  # 如果失败则返回原始查询

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
            logger.debug(f"请求头: {dict(request.headers)}")
            return ('', 204, headers)

        try:
            # 记录请求详情
            logger.info(f"开始处理POST请求: /api/chat")
            logger.debug(f"请求头: {dict(request.headers)}")
            
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
            model_name = data.get('model_name', data.get('model', 'google/gemini-2.0-flash-exp:free'))  # 设置为有效的默认模型ID
            is_deep_research = data.get('deep_research', False)  # 获取深度研究模式标志
            is_web_search = data.get('web_search', False)  # 获取联网搜索标志
            is_stream = data.get("stream", True)
            logger.info(f"当前模式: {'深度研究' if is_deep_research else '普通对话'}, 联网搜索: {'开启' if is_web_search else '关闭'}")
            if api_key and base_url:
                # 检查是否为 OpenRouter 请求
                is_openrouter = "openrouter.ai" in base_url
                
                # 初始化 OpenAI 客户端
                client = OpenAI(
                    api_key=api_key,
                    base_url=base_url
                )
                
                # 创建请求参数
                completion_args = {
                    "model": model_name,  # 使用处理后的模型名称
                    "messages": messages,
                    "stream": is_stream,
                }
                
                # 添加 OpenRouter 所需的额外请求头
                if is_openrouter:
                    # 获取请求头信息，支持大小写混合的情况
                    headers_lower = {k.lower(): v for k, v in request.headers.items()}
                    referer = headers_lower.get('http-referer') or headers_lower.get('x-forwarded-for', 'https://mini-chatbot.example.com')
                    title = headers_lower.get('x-title', 'Mini-Chatbot')
                    
                    # 添加到 extra_headers
                    completion_args["extra_headers"] = {
                        "HTTP-Referer": referer,
                        "X-Title": title
                    }
                    
                    logger.info(f"使用 OpenRouter API，模型: {model_name}")
                    logger.debug(f"OpenRouter 额外请求头: {completion_args['extra_headers']}")
            else:
                client = None

            # 如果启用了联网搜索，获取web搜索结果
            search_result_urls_str = ""
            if is_web_search and client:
                cur_date = datetime.now().strftime("%Y-%m-%d")
                user_query = messages[-1]['content']

                expanded_query = get_search_intent(user_query, client, model_name)
                # 使用事件循环运行异步函数
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                web_search_results, search_results_str, search_result_urls_str = loop.run_until_complete(get_web_kg(expanded_query))
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
                if client:
                    response = client.chat.completions.create(
                        **completion_args  # 使用构建的参数
                    )
                else:
                    response = None

            # 处理非流式响应
            if not is_stream and client:
                try:
                    if response and hasattr(response, 'choices') and len(response.choices) > 0:
                        content = response.choices[0].message.content
                        response_data = {
                            "success": True,
                            "choices": [
                                {
                                    "message": {
                                        "content": content
                                    }
                                }
                            ]
                        }
                        
                        # 如果启用了联网搜索，添加网页链接
                        if is_web_search and search_result_urls_str:
                            response_data["web_search_results"] = search_result_urls_str
                        
                        # 如果响应中有 usage 信息，也包含它
                        if hasattr(response, 'usage'):
                            response_data["usage"] = {
                                "prompt_tokens": response.usage.prompt_tokens,
                                "completion_tokens": response.usage.completion_tokens,
                                "total_tokens": response.usage.total_tokens
                            }
                        
                        CustomLogger.response_complete(messages[-1]['content'], content)
                        return jsonify(response_data)
                    else:
                        return jsonify({"error": "未收到有效的响应"}), 500
                except Exception as e:
                    logger.error(f"处理非流式响应时出错: {str(e)}")
                    return jsonify({"error": str(e)}), 500

            # 生成流式响应
            def generate():
                full_response = []
                try:
                    for chunk in response:
                        logger.debug("收到 chunk: %s", chunk)
                        if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                            if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                                content = chunk.choices[0].delta.reasoning_content
                                data = json.dumps({'choices': [{'delta': {'reasoning_content': content}}]}, ensure_ascii=False)
                                yield f"data: {data}\n\n".encode('utf-8')
                                full_response.append(content)
                            elif hasattr(chunk.choices[0].delta, 'reasoning') and chunk.choices[0].delta.reasoning:
                                content = chunk.choices[0].delta.reasoning
                                data = json.dumps({'choices': [{'delta': {'reasoning_content': content}}]}, ensure_ascii=False)
                                yield f"data: {data}\n\n".encode('utf-8')
                                full_response.append(content)
                            elif hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                                content = chunk.choices[0].delta.content
                                data = json.dumps({'choices': [{'delta': {'content': content}}]}, ensure_ascii=False)
                                yield f"data: {data}\n\n".encode('utf-8')
                                full_response.append(content)
                        else:
                            logger.error("收到 chunk 中没有 choices 字段")
                    
                    # 如果启用了联网搜索，添加网页链接
                    if is_web_search and search_result_urls_str:
                        content_str = '\n\n相关网页链接：' + search_result_urls_str + '\n'
                        data = json.dumps({'choices': [{'delta': {'content': content_str}}]}, ensure_ascii=False)
                        yield f"data: {data}\n\n".encode('utf-8')

                    yield b"data: [DONE]\n\n"
                    CustomLogger.response_complete(messages[-1]['content'], ''.join(full_response))
                except Exception as e:
                    logger.error("生成响应流时出错: %s", str(e))
                    error_data = json.dumps({'error': str(e)}, ensure_ascii=False)
                    yield f"data: {error_data}\n\n".encode('utf-8')
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