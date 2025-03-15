from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from bs4 import BeautifulSoup
import time
import random
import urllib.parse
import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional

class SearXNGSeleniumClient:
    """
    A client for interacting with a SearXNG search engine instance using Selenium.
    """
    
    # 定义可用的搜索参数
    TIME_RANGES = {
        'day': '1d',      # 最近一天
        'week': '1w',     # 最近一周
        'month': '1M',    # 最近一月
        'year': '1y',     # 最近一年
    }
    
    LANGUAGES = {
        'zh-CN': '简体中文',
        'zh-TW': '繁体中文',
        'en': 'English',
        'auto': '自动检测',
        'all': '所有语言'
    }
    
    SAFESEARCH = {
        0: '关闭',        # 无过滤
        1: '中等',        # 中等过滤
        2: '严格'         # 严格过滤
    }
    
    def __init__(self, 
                 base_url="https://search.inetol.net", 
                 timeout=30,
                 language='auto',
                 time_range=None,
                 safesearch=1,
                 categories=None):
        """
        Initialize the SearXNG Selenium client.
        
        Args:
            base_url (str): The base URL of the SearXNG instance
            timeout (int): Timeout in seconds for page loading
            language (str): Default search language (e.g., 'zh-CN', 'en', 'auto')
            time_range (str): Default time range filter (e.g., 'day', 'week', 'month', 'year')
            safesearch (int): Safe search level (0=关闭, 1=中等, 2=严格)
            categories (list): Default search categories (e.g., ['general', 'news'])
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        
        # 验证并设置默认搜索参数
        self.language = language if language in self.LANGUAGES else 'auto'
        self.time_range = self.TIME_RANGES.get(time_range, '')
        self.safesearch = safesearch if safesearch in self.SAFESEARCH else 1
        self.categories = categories or ['general']
        
        self.driver = None
        self.init_driver()
    
    def init_driver(self):
        """Initialize the Selenium WebDriver with appropriate options."""
        options = Options()
        
        # Run in headless mode (no UI)
        options.add_argument('--headless')
        
        # Additional options to make the browser more stable
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        
        # Mimic a regular browser
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36')
        
        # Disable automation flags
        options.add_experimental_option('excludeSwitches', ['enable-automation'])
        options.add_experimental_option('useAutomationExtension', False)
        
        try:
            # 使用webdriver_manager自动安装和管理ChromeDriver
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            self.driver.set_page_load_timeout(self.timeout)
        except Exception as e:
            print(f"Failed to initialize Chrome driver: {e}")
            print("Trying Firefox as fallback...")
            try:
                # 使用webdriver_manager自动安装和管理GeckoDriver
                from selenium.webdriver.firefox.options import Options as FirefoxOptions
                firefox_options = FirefoxOptions()
                firefox_options.add_argument('--headless')
                service = Service(GeckoDriverManager().install())
                self.driver = webdriver.Firefox(service=service, options=firefox_options)
                self.driver.set_page_load_timeout(self.timeout)
            except Exception as e2:
                print(f"Failed to initialize Firefox driver: {e2}")
                print("Please ensure you have either Chrome or Firefox browser installed.")
                raise
    
    def __del__(self):
        """Cleanup method to ensure the browser is closed."""
        self.close()
    
    def close(self):
        """Close the browser."""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
            self.driver = None
    
    def visit_homepage(self):
        """
        Visit the homepage to establish cookies and session.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.driver.get(self.base_url)
            
            # Wait for the page to load
            WebDriverWait(self.driver, self.timeout).until(
                EC.presence_of_element_located((By.TAG_NAME, 'body'))
            )
            
            # Random wait to mimic human behavior
            time.sleep(random.uniform(1, 3))
            
            # Check if the page loaded successfully
            if "SearXNG" in self.driver.title or "Search" in self.driver.title:
                print("Homepage loaded successfully.")
                return True
            else:
                print(f"Homepage loaded but title doesn't match expected: {self.driver.title}")
                return True  # Still return True as the page did load
        
        except TimeoutException:
            print("Timeout while loading homepage.")
            return False
        except WebDriverException as e:
            print(f"Error while visiting homepage: {e}")
            return False
    
    def search(self, 
               query: str,
               categories: List[str] = None,
               language: str = None,
               time_range: str = None,
               safesearch: int = None,
               page: int = 1) -> BeautifulSoup:
        """
        Perform a search query on the SearXNG instance.
        
        Args:
            query (str): The search query
            categories (list): Search categories (e.g., ['general', 'news'])
            language (str): Result language (e.g., 'zh-CN', 'en', 'auto')
            time_range (str): Time filter ('day', 'week', 'month', 'year')
            safesearch (int): Safe search level (0=关闭, 1=中等, 2=严格)
            page (int): Results page number
        
        Returns:
            BeautifulSoup object with the parsed HTML results
        """
        try:
            # First visit the homepage if not already done
            if not hasattr(self, 'homepage_visited') or not self.homepage_visited:
                self.homepage_visited = self.visit_homepage()
                if not self.homepage_visited:
                    print("Could not load homepage, attempting search directly...")
            
            # 使用传入的参数，如果没有则使用默认值
            search_categories = categories or self.categories
            search_language = language or self.language
            search_time_range = self.TIME_RANGES.get(time_range, '') if time_range else self.time_range
            search_safesearch = safesearch if safesearch in self.SAFESEARCH else self.safesearch
            
            # Construct the search URL
            search_params = {
                'q': query,
                'language': search_language,
                'safesearch': str(search_safesearch)
            }
            
            # 添加时间范围参数
            if search_time_range:
                search_params['time_range'] = search_time_range
            
            # 添加分类参数
            for category in search_categories:
                search_params[f'category_{category}'] = '1'
            
            # 添加页码
            if page > 1:
                search_params['pageno'] = str(page)
            
            # Build the query string
            query_string = '&'.join([f"{k}={urllib.parse.quote(v)}" for k, v in search_params.items()])
            search_url = f"{self.base_url}/search?{query_string}"
            
            print(f"搜索URL: {search_url}")
            self.driver.get(search_url)
            
            # Wait for results to load
            try:
                WebDriverWait(self.driver, self.timeout).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '.result, #q'))
                )
            except TimeoutException:
                print("Timeout waiting for search results. Page may have different structure.")
            
            # Get the page source after it's loaded
            html = self.driver.page_source
            
            # Check for error messages or blocks
            if "429" in html and "Too Many Requests" in html:
                print("Received 429 Too Many Requests in response.")
                try:
                    screenshot_path = "search_error.png"
                    self.driver.save_screenshot(screenshot_path)
                    print(f"Screenshot saved to {os.path.abspath(screenshot_path)}")
                except Exception as e:
                    print(f"Failed to save screenshot: {e}")
            
            return BeautifulSoup(html, 'html.parser')
            
        except Exception as e:
            print(f"Error during search: {e}")
            try:
                screenshot_path = "search_error.png"
                self.driver.save_screenshot(screenshot_path)
                print(f"Error screenshot saved to {os.path.abspath(screenshot_path)}")
            except:
                pass
            raise
    
    def parse_results(self, soup):
        """
        Parse HTML search results into a structured format.
        
        Args:
            soup (BeautifulSoup): BeautifulSoup object with the parsed HTML results
            
        Returns:
            list: List of dictionaries containing the search results
        """
        results = []
        
        # Check if we got an error page instead of results
        error_indicators = [
            "429", "Too Many Requests", "security policies", 
            "blocked", "suspicious", "captcha"
        ]
        
        page_text = soup.get_text().lower()
        for indicator in error_indicators:
            if indicator.lower() in page_text:
                print(f"Found error indicator in page: '{indicator}'")
                # Continue parsing anyway, in case some results are still present
        
        # Find all result containers - try various selectors
        result_containers = soup.select('.result')
        
        if not result_containers:
            # Try alternative selectors
            selectors = [
                '.result-default', '.result-item', '.search-result',
                'article', '.searx-result', 'div[id^="result-"]'
            ]
            
            for selector in selectors:
                result_containers = soup.select(selector)
                if result_containers:
                    print(f"Found results using selector: {selector}")
                    break
        
        if not result_containers:
            print("No results found with standard selectors. Page structure might be different.")
            # Print page title for context
            title = soup.find('title')
            if title:
                print(f"Page title: {title.get_text()}")
            return []
        
        for container in result_containers:
            result = {}
            
            # Try different selector patterns for title and URL
            title_selectors = ['.result-title', '.result-header a', 'h3 a', 'h4 a', '.title a', 'a.title']
            content_selectors = ['.result-content', '.result-snippet', '.content', '.snippet', '.description', 'p']
            
            # Extract title and URL
            for selector in title_selectors:
                title_element = container.select_one(selector)
                if title_element and title_element.get('href'):
                    result['title'] = title_element.get_text(strip=True)
                    result['url'] = title_element.get('href')
                    break
            
            # Extract content/snippet
            for selector in content_selectors:
                content_element = container.select_one(selector)
                if content_element:
                    result['content'] = content_element.get_text(strip=True)
                    break
            
            # Only add if we found at least a title
            if 'title' in result:
                results.append(result)
        
        return results

def multi_search(query: str, batch_size: int = 3, max_retries: int = 3) -> List[Dict]:
    """
    从多个SearXNG实例中搜索并合并结果
    
    Args:
        query: 搜索关键词
        batch_size: 每批次并行搜索的实例数量
        max_retries: 最大重试批次数
        
    Returns:
        合并后的搜索结果列表
    """
    def load_instances() -> List[str]:
        """加载排序后的实例URL列表"""
        try:
            # 获取当前脚本所在目录
            current_dir = os.path.dirname(os.path.abspath(__file__))
            json_path = os.path.join(current_dir, "searx_instances_sorted.json")
            
            print(f"尝试从以下路径加载实例列表: {json_path}")
            
            if not os.path.exists(json_path):
                print(f"错误: 文件不存在 {json_path}")
                return []
                
            with open(json_path, "r", encoding="utf-8") as f:
                instances = json.load(f)
                urls = [instance["url"] for instance in instances]
                print(f"成功加载 {len(urls)} 个实例URL")
                return urls
        except Exception as e:
            print(f"加载实例列表失败: {e}")
            return []
    
    def search_with_instance(url: str) -> List[Dict]:
        """使用指定实例进行搜索"""
        try:
            client = SearXNGSeleniumClient(base_url=url)
            soup_results = client.search(query)
            results = client.parse_results(soup_results)
            client.close()
            return results
        except Exception as e:
            print(f"实例 {url} 搜索失败: {e}")
            return []
        finally:
            if 'client' in locals():
                client.close()
    
    def merge_results(all_results: List[List[Dict]]) -> List[Dict]:
        """合并搜索结果并去重"""
        seen_urls = set()
        merged = []
        
        for results in all_results:
            for result in results:
                url = result.get('url')
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    merged.append(result)
        
        return merged

    # 加载实例列表
    instances = load_instances()
    if not instances:
        print("未找到可用的搜索实例")
        return []
    
    merged_results = []
    retry_count = 0
    
    while retry_count < max_retries and not merged_results:
        # 获取当前批次的实例
        start_idx = retry_count * batch_size
        current_batch = instances[start_idx:start_idx + batch_size]
        
        if not current_batch:
            print("没有更多可用的实例")
            break
        
        print(f"\n尝试第 {retry_count + 1} 批实例:")
        for url in current_batch:
            print(f"- {url}")
        
        # 并行搜索
        batch_results = []
        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            future_to_url = {
                executor.submit(search_with_instance, url): url 
                for url in current_batch
            }
            
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    results = future.result()
                    if results:
                        print(f"实例 {url} 返回 {len(results)} 条结果")
                        batch_results.append(results)
                    else:
                        print(f"实例 {url} 未返回结果")
                except Exception as e:
                    print(f"实例 {url} 执行失败: {e}")
        
        # 合并当前批次结果
        if batch_results:
            merged_results = merge_results(batch_results)
            print(f"\n成功获取 {len(merged_results)} 条去重后的结果")
            break
        
        retry_count += 1
        print(f"当前批次未获得结果，尝试下一批实例...")
    
    if not merged_results:
        print("\n所有尝试均未获得结果")
    
    return merged_results

# Example usage
if __name__ == "__main__":
    try:
        # 使用多实例搜索
        query = "openai最近的新闻"
        print(f"使用多实例搜索: {query}")
        
        results = multi_search(query)
        
        # 打印结果
        print(f"\n找到 {len(results)} 条结果:")
        for i, result in enumerate(results, 1):
            print(f"\n--- 结果 {i} ---")
            print(f"标题: {result.get('title', 'N/A')}")
            print(f"URL: {result.get('url', 'N/A')}")
            content = result.get('content', 'N/A')
            print(f"内容: {content[:100]}..." if len(content) > 100 else f"内容: {content}")
    
    except Exception as e:
        print(f"搜索过程中出错: {e}")