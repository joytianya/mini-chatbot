from flask import request, jsonify, Response, stream_with_context
import json
import logging
import asyncio
from datetime import datetime
from openai import OpenAI
from web_kg import get_web_kg
from utils.text_utils import is_chinese
from utils.logger_utils import CustomLogger
from system_prompts import search_answer_zh_template, search_answer_en_template

logger = logging.getLogger(__name__)

def register_doc_chat_routes(app, doc_store):
    """注册文档聊天相关路由"""
    
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
            document_ids = [doc_id for doc_id in data.get('document_ids', []) if doc_id]  # 过滤掉None和空值
            # 兼容旧版本，如果提供了单个document_id且有效，将其添加到document_ids列表中
            if data.get('document_id') and data.get('document_id') not in document_ids:
                document_ids.append(data.get('document_id'))
            
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
            logger.info(f"document_ids: {document_ids}")
            logger.info(f"消息数量: {len(messages)}")
            logger.info(f"深度研究模式: {'开启' if is_deep_research else '关闭'}")
            logger.info(f"联网搜索: {'开启' if is_web_search else '关闭'}")
            
            # 获取用户最新的问题
            user_query = messages[-1]['content']
            logger.info(f"用户问题: {user_query}")
            
            # 如果启用了联网搜索，获取web搜索结果
            search_result_urls_str = ""
            if is_web_search:
                cur_date = datetime.now().strftime("%Y-%m-%d")
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
            if doc_store is None:
                logger.error("doc_store为空，无法处理文档聊天请求")
                return jsonify({'error': 'DocumentStore未初始化'}), 500
            
            # 更新doc_store配置
            doc_store.update_config(
                api_key=embedding_api_key,
                base_url=embedding_base_url,
                model_name=embedding_model_name
            )
            
            # 获取相关文档内容
            context = ""
            if document_ids:
                # 如果提供了文档ID列表，则在这些文档中搜索
                logger.info(f"在指定的 {len(document_ids)} 个文档中搜索相关内容")
                for doc_id in document_ids:
                    logger.info(f"搜索文档: {doc_id}")
                    try:
                        # 在每个文档中搜索相关内容
                        docs = doc_store.search(user_query, k=5, document_id=doc_id)
                        if docs:
                            # 将每个文档的搜索结果添加到上下文中
                            doc_context = "\n\n".join([doc.page_content for doc in docs])
                            context += f"\n\n文档 {doc_id} 的相关内容:\n{doc_context}"
                            logger.info(f"在文档 {doc_id} 中找到 {len(docs)} 个相关片段")
                        else:
                            logger.warning(f"在文档 {doc_id} 中未找到相关内容")
                    except Exception as e:
                        logger.error(f"搜索文档 {doc_id} 时出错: {str(e)}")
            else:
                # 如果没有提供文档ID，则在所有文档中搜索
                logger.info("在所有文档中搜索相关内容")
                docs = doc_store.search(user_query, k=5)
                context = "\n\n".join([doc.page_content for doc in docs])
                logger.info(f"找到 {len(docs)} 个相关片段")
            
            # 如果没有找到相关内容，记录警告
            if not context.strip():
                logger.warning("未找到相关文档内容")
                context = "未找到相关文档内容。"
            
            # 记录聊天完成信息
            CustomLogger.chat_completion(user_query, len(context.split("\n")), context)
            
            # 构建系统消息
            system_message = {
                "role": "system",
                "content": f"""你是一个智能助手，可以回答用户关于文档的问题。
请基于以下文档内容回答用户的问题。如果文档内容中没有相关信息，请诚实地告诉用户你不知道，不要编造答案。

文档内容:
{context}

请注意:
1. 回答要简洁明了，直接基于文档内容回答问题
2. 如果文档内容不足以回答问题，请明确告知用户
3. 不要在回答中包含"根据文档内容"、"文档中提到"等词语
4. 如果用户问题与文档无关，请礼貌地将话题引导回文档内容"""
            }
            
            # 构建请求消息
            request_messages = [system_message]
            for msg in messages[1:]:  # 跳过原始系统消息
                request_messages.append(msg)
            
            # 创建客户端
            client = OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            
            # 检查是否为 OpenRouter 请求
            is_openrouter = "openrouter.ai" in base_url
            
            # 创建请求参数
            completion_args = {
                "model": model_name,
                "messages": [m for m in request_messages],
                "stream": True,
                "temperature": 0.7,
            }
            
            # 添加 OpenRouter 所需的额外请求头
            if is_openrouter:
                # 获取请求头信息
                referer = request.headers.get('HTTP-Referer', 'https://mini-chatbot.example.com')
                title = request.headers.get('X-Title', 'Mini-Chatbot')
                
                # 添加到 extra_headers
                completion_args["extra_headers"] = {
                    "HTTP-Referer": referer,
                    "X-Title": title
                }
                
                logger.info(f"使用 OpenRouter API，模型: {model_name}")
            
            # 发送请求
            logger.info(f"发送请求到模型: {model_name}")
            response = client.chat.completions.create(**completion_args)
            
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
            error_msg = f"处理请求时出错: {str(e)}"
            logger.error(error_msg)
            return jsonify({'error': error_msg}), 500, headers