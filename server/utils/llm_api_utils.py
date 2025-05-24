from openai import OpenAI
import logging # Though logger is passed in, importing for type hinting or future use if needed

def call_llm_api(api_key: str, base_url: str, model_name: str, messages: list, stream: bool, request_headers, logger, temperature: float = None):
    """
    Calls the LLM API using the OpenAI client.

    Args:
        api_key (str): The API key for authentication.
        base_url (str): The base URL of the LLM API.
        model_name (str): The name of the model to use.
        messages (list): A list of message objects for the chat.
        stream (bool): Whether to stream the response.
        request_headers: The headers from the original HTTP request.
        logger: Logger instance for logging.
        temperature (float, optional): Sampling temperature. Defaults to None.

    Returns:
        The response from the LLM API.
    """
    try:
        client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )

        completion_args = {
            "model": model_name,
            "messages": messages,
            "stream": stream,
        }

        if temperature is not None:
            completion_args["temperature"] = temperature

        if "openrouter.ai" in base_url:
            headers_lower = {k.lower(): v for k, v in request_headers.items()}
            # Use X-Forwarded-For if available (common in reverse proxy setups), otherwise default to a placeholder
            referer = headers_lower.get('http-referer') or headers_lower.get('x-forwarded-for', 'https://mini-chatbot.example.com')
            title = headers_lower.get('x-title', 'Mini-Chatbot') # Use X-Title if provided by client

            completion_args["extra_headers"] = {
                "HTTP-Referer": referer,
                "X-Title": title
            }
            logger.info(f"Using OpenRouter API. Model: {model_name}, Referer: {referer}, Title: {title}")
            logger.debug(f"OpenRouter extra_headers: {completion_args['extra_headers']}")

        logger.debug(f"Calling LLM API with args: {completion_args}")
        response = client.chat.completions.create(**completion_args)
        
        # 添加响应检查和日志
        if stream:
            logger.info(f"LLM API returned streaming response for model: {model_name}")
            # 对于流式响应，我们需要包装迭代器来记录内容
            def log_streaming_response(response_iter):
                chunk_count = 0
                content_received = False
                for chunk in response_iter:
                    chunk_count += 1
                    if hasattr(chunk, 'choices') and chunk.choices:
                        delta = chunk.choices[0].delta
                        if hasattr(delta, 'content') and delta.content:
                            content_received = True
                        elif hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                            content_received = True
                    yield chunk
                
                logger.info(f"Streaming completed: {chunk_count} chunks, content_received: {content_received}")
                if not content_received:
                    logger.warning(f"No content received from model {model_name} in {chunk_count} chunks")
            
            return log_streaming_response(response)
        else:
            # 对于非流式响应，直接检查内容
            if hasattr(response, 'choices') and response.choices:
                content = response.choices[0].message.content if response.choices[0].message else ""
                logger.info(f"LLM API returned non-streaming response. Content length: {len(content) if content else 0}")
                if not content:
                    logger.warning(f"Empty content received from model: {model_name}")
            else:
                logger.warning(f"No choices in response from model: {model_name}")
            
            return response

    except Exception as e:
        logger.error(f"Error calling LLM API: {str(e)}", exc_info=True)
        # Depending on how errors should be propagated, you might re-raise or return a specific error object.
        # For now, re-raising to let the caller handle it.
        raise
