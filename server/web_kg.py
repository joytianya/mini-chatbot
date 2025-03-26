import requests
import asyncio
from crawl4ai import AsyncWebCrawler
import json
import re
from bs4 import BeautifulSoup
from searx_client import MultiSearXClient
# SearXNG搜索函数
def search_with_searxng(query, num_results=5, engines="google,bing"):
    url = 'https://searxng-render.onrender.com/search'
    params = {
        'q': query,
        'format': 'json',
        'language': 'zh-CN',
        'engines': engines,
    }
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                      'AppleWebKit/537.36 (KHTML, like Gecko)'
                      'Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }
    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    results = response.json().get('results', [])[:num_results]
    return results

# 单个网页抓取函数
async def crawl_single_page(url):
    async with AsyncWebCrawler() as crawler:
        try:
            result = await crawler.arun(url=url)
            content = result.markdown
            content = clean_content(content)
        except Exception as e:
            print(f"抓取失败: {url}, 错误: {e}")
            content = ''
    return {'url': url, 'content': content}

def clean_content(text):
    if not text:
        return ''
        
    # 清理图片链接
    clean_text = re.sub(r'!\[.*?\]\(.*?\)', '', text)

    # 清理javascript链接
    clean_text = re.sub(r'\[.*?\]\(javascript.*?\)', '', clean_text)

    # 清理所有Markdown格式链接
    clean_text = re.sub(r'\[.*?\]\(http[s]?://.*?\)', '', clean_text)

    # 清理空链接
    clean_text = re.sub(r'\[\]\(.*?\)', '', clean_text)

    # 去除多余符号
    clean_text = re.sub(r'[-=_]{3,}', '', clean_text)

    # 清理多余的换行
    clean_text = re.sub(r'\n+', '\n', clean_text)
    
    # 清理不可见字符和控制字符
    clean_text = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', clean_text)
    # 去掉无意义的*
    clean_text = re.sub(r'\*.*?\*', '', clean_text)
    return clean_text

import json
import requests

async def crawl_single_page_jina(url):
    url = 'https://r.jina.ai/' + url
    headers = {
        "Accept": "text/event-stream",
        "X-Retain-Images": "none",
        "X-Return-Format": "markdown"
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        response.encoding = "utf-8"
        
        # 解析 SSE 数据，找到 JSON 格式的内容
        for line in response.text.splitlines():
            if line.startswith("data: "):  # 找到包含 JSON 数据的行
                json_data = line[6:].strip()  # 去掉 "data: " 部分
                try:
                    parsed_data = json.loads(json_data)  # 解析 JSON
                    content = parsed_data.get("content", "")  # 获取 content
                    content = clean_content(content)
                    return {'url': url, 'content': content}
                except json.JSONDecodeError as e:
                    print(f"JSON 解析错误: {str(e)}")
                    return {'url': url, 'content': ''}
        
        return {'url': url, 'content': ''}
    
    except Exception as e:
        print(f"爬取页面失败: {url}, 错误: {str(e)}")
        return {'url': url, 'content': ''}
    
multi_client = MultiSearXClient()
# 主函数：搜索+抓取网页内容
async def get_web_kg(query, num_results=3, offset=0):
    try:
        
        #search_results = search_with_searxng(query)
        search_results = multi_client.multi_search(query)

    except Exception as e:
        print(f"搜索失败: {e}")
        search_results = []
    search_results = search_results[:num_results]
    print("获取搜索结果done")
    tasks = [
        #crawl_single_page_jina(result['url'])
        crawl_single_page(result['url'])
        for result in search_results
    ]
    print("开始抓取内容")
    try:
        crawled_contents = await asyncio.gather(*tasks)
        print(crawled_contents)
    except Exception as e:
        print(f"抓取失败: {e}")
        crawled_contents = [{"url": "", "content": ""}]*len(search_results)
    print("获取抓取内容done")
    
    # 组合搜索结果与抓取内容
    combined_results = []
    for idx, result in enumerate(search_results):
        try:
            #print(crawled_contents[idx].get('content', ''))
            combined_result = {
                "title": result.get('title', '').strip(),
                "url": result.get('url', '').strip(),
                "summary": result.get('content', '').strip(),
                "content": crawled_contents[idx].get('content', '')[:500]
            }
            combined_results.append(combined_result)
        except Exception as e:
            print(f"处理结果失败: {e}")
            continue

    # 返回组合后的结构化数据
    search_results = []
    search_result_urls = []
    for idx, item in enumerate(combined_results):
        try:
            search_results.append(f"[webpage {idx+1+offset} begin]第{idx+1+offset}个网站资料：\\n网站url: {item['url']} \\n标题：{item['title']} \\n摘要：{item['summary']}\\n正文：{item['content']}\\n[webpage {idx+1+offset} end]")
            search_result_urls.append(f"\n\n[citation:{idx+1+offset}] {item['url']}")
        except Exception as e:
            print(f"生成摘要失败: {e}")
            continue
    search_results_str = "\n\n".join(search_results)
    search_result_urls_str = "\n\n".join(search_result_urls)
    return combined_results, search_results_str, search_result_urls_str

    # 显示组合后的结构化数据
    #for item in combined_results:
    #    print(f"标题：{item['title']}")
    #    print(f"链接：{item['url']}")
    #    print(f"摘要：{item['summary']}")
    #    print(f"正文内容(前500字)：\n{item['content'][:500]}...\n{'-'*50}\n")

# 执行示例搜索
if __name__ == "__main__":
    query = "GPT-4 最新动态"
    asyncio.run(main(query))
