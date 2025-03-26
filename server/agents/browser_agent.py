import os
import asyncio
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from pathlib import Path
from browser_use import Agent, Browser, BrowserConfig

#load_dotenv()

api_key_deepseek = os.getenv('DEEPSEEK_API_KEY', 'sk-4fe839d0554c439384048110f16f8665')
if not api_key_deepseek:
	raise ValueError('DEEPSEEK_API_KEY is not set')


async def run_agent(task: str, max_steps: int = 38):
	chrome_path = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
	browser = Browser(
        config=BrowserConfig(
            #disable_security=True,
            #chrome_instance_path=chrome_path,
            headless=False,
        )
    )   
	llm = ChatOpenAI(
		base_url='https://openrouter.ai/api/v1',
		model='openai/gpt-4o',
		api_key=SecretStr("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"),
	)
	agent = Agent(task=task, llm=llm, browser=browser)
	result = await agent.run(max_steps=max_steps)
	return result


asyncio.run(run_agent(''''''))