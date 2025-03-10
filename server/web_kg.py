import requests
import asyncio
from crawl4ai import AsyncWebCrawler
import json
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
async def crawl_single_page(url, title):
    async with AsyncWebCrawler() as crawler:
        try:
            result = await crawler.arun(url=url)
            content = result.markdown
        except Exception as e:
            print(f"抓取失败: {url}, 错误: {e}")
            content = ''
    return {'title': title, 'url': url, 'content': content}

# 主函数：搜索+抓取网页内容
async def get_web_kg(query):
    search_results = search_with_searxng(query)

    tasks = [
        crawl_single_page(result['url'], result['title'])
        for result in search_results
    ]
    try:
        crawled_contents = await asyncio.gather(*tasks)
    except Exception as e:
        print(f"抓取失败: {e}")
        crawled_contents = []*len(search_results)
    # 组合搜索结果与抓取内容
    combined_results = []
    for idx, result in enumerate(search_results):
        combined_result = {
            "title": result['title'],
            "url": result['url'],
            "summary": result['content'],
            "content": crawled_contents[idx]['content'][:500]
        }
        combined_results.append(combined_result)

    # 返回组合后的结构化数据
    # 标题以及摘要标识的组合，带上第几个文档标识
    summary_combined = ""
    for idx, item in enumerate(combined_results):
        summary_combined += f"第{idx+1}个网站资料：网站url: {item['url']} \n 标题：{item['title']} \n 摘要：{item['summary']}\n"
    return combined_results, summary_combined

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
