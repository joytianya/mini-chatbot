import os
import asyncio
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from pathlib import Path
from browser_use import Agent, Browser, BrowserConfig

# 加载环境变量
load_dotenv()

# 从环境变量获取API密钥，不要使用硬编码的默认值
api_key_deepseek = os.getenv('DEEPSEEK_API_KEY')
if not api_key_deepseek:
	raise ValueError('DEEPSEEK_API_KEY 环境变量未设置，请在.env文件中添加此变量')

# 从环境变量获取OpenRouter API密钥
openrouter_api_key = os.getenv('OPENROUTER_API_KEY')
if not openrouter_api_key:
	raise ValueError('OPENROUTER_API_KEY 环境变量未设置，请在.env文件中添加此变量')

async def run_agent(task: str, max_steps: int = 38):
	chrome_path = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
	browser = Browser(
        config=BrowserConfig(
            disable_security=True,
            #chrome_instance_path=chrome_path,
            headless=False,
        )
    )   
	llm = ChatOpenAI(
		base_url='https://openrouter.ai/api/v1',
		model='openai/gpt-4o',
		api_key=SecretStr(openrouter_api_key),
	)
	agent = Agent(task=task, llm=llm, browser=browser)
	result = await agent.run(max_steps=max_steps)
	return result


asyncio.run(run_agent('''北京到上海的火车票'''))