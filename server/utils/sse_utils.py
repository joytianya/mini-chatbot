import json
import logging

def stream_sse_response(response_iterator, logger, web_search_results_str=None, custom_logger=None, original_query=None):
    """
    Streams Server-Sent Events (SSE) from an LLM response iterator.

    Args:
        response_iterator: Iterator yielding chunks from the LLM.
        logger: Logger instance for logging.
        web_search_results_str (str, optional): Web search results to append. Defaults to None.
        custom_logger (CustomLogger, optional): CustomLogger for completion logging. Defaults to None.
        original_query (str, optional): Original query for CustomLogger. Defaults to None.
    """
    full_response_parts = []
    chunk_count = 0
    
    try:
        for chunk in response_iterator:
            chunk_count += 1
            logger.debug("SSE util received chunk: %s", chunk)
            if hasattr(chunk, 'choices') and chunk.choices:
                delta = chunk.choices[0].delta
                reasoning_content = None
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    reasoning_content = delta.reasoning_content
                    data = json.dumps({'choices': [{'delta': {'reasoning_content': reasoning_content}}]}, ensure_ascii=False)
                    yield f"data: {data}\n\n".encode('utf-8')
                    full_response_parts.append(reasoning_content)
                elif hasattr(delta, 'reasoning') and delta.reasoning: # Compatibility for potential 'reasoning' field
                    reasoning_content = delta.reasoning
                    data = json.dumps({'choices': [{'delta': {'reasoning_content': reasoning_content}}]}, ensure_ascii=False)
                    yield f"data: {data}\n\n".encode('utf-8')
                    full_response_parts.append(reasoning_content)

                if hasattr(delta, 'content') and delta.content:
                    content = delta.content
                    data = json.dumps({'choices': [{'delta': {'content': content}}]}, ensure_ascii=False)
                    yield f"data: {data}\n\n".encode('utf-8')
                    full_response_parts.append(content)
            else:
                logger.error("SSE util: Unexpected chunk structure or empty choices: %s", chunk)

        # 检查是否收到了空响应
        if chunk_count == 0 or len(full_response_parts) == 0:
            logger.warning("SSE util: Empty response detected, providing fallback message")
            fallback_message = "抱歉，模型暂时没有返回内容。这可能是由于免费模型的使用限制或网络问题。请稍后重试，或考虑使用其他模型。"
            data = json.dumps({'choices': [{'delta': {'content': fallback_message}}]}, ensure_ascii=False)
            yield f"data: {data}\n\n".encode('utf-8')
            full_response_parts.append(fallback_message)

        if web_search_results_str:
            data = json.dumps({'choices': [{'delta': {'content': web_search_results_str}}]}, ensure_ascii=False)
            yield f"data: {data}\n\n".encode('utf-8')
            full_response_parts.append(web_search_results_str) # Also add to full response for logging

        yield b"data: [DONE]\n\n"

        if custom_logger and original_query:
            custom_logger.response_complete(original_query, ''.join(full_response_parts))

    except Exception as e:
        logger.error("SSE util: Stream generation error: %s", str(e), exc_info=True)
        error_message = f'{{"error": "Stream generation error: {str(e)}"}}'
        yield f"data: {error_message}\n\n".encode('utf-8')
        yield b"data: [DONE]\n\n"
