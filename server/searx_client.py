from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from bs4 import BeautifulSoup
import time
import random
import urllib.parse
import os
import json
import concurrent.futures
from typing import List, Dict, Optional

class MultiSearXClient:
    """
    A client that manages multiple SearXNG instances for parallel searching.
    """
    def __init__(self, instances_file: str = None, max_instances: int = 10):
        # 如果没有指定文件路径,使用当前脚本所在目录下的json文件
        if instances_file is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            instances_file = os.path.join(current_dir, "searx_instances_sorted.json")
        self.instances_file = instances_file
        self.max_instances = max_instances
        self.instances: List[Dict] = self._load_instances()
        self.clients: List[SearXNGSeleniumClient] = []
        self.search_stats: Dict[str, int] = {}  # 用于存储每个实例的结果数量
        self._initialize_clients()
    
    def _load_instances(self) -> List[Dict]:
        """Load SearX instances from the JSON file."""
        try:
            with open(self.instances_file, 'r') as f:
                instances = json.load(f)
            print(f"加载{len(instances)}个实例")
            return instances[:self.max_instances]  # Only use top N instances
        except Exception as e:
            print(f"Error loading instances file: {e}")
            return []
    
    def _initialize_clients(self):
        """Initialize SearXNG clients for each instance."""
        for instance in self.instances:
            try:
                client = SearXNGSeleniumClient(base_url=instance['url'])
                self.clients.append(client)
                self.search_stats[instance['url']] = 0  # 初始化统计
            except Exception as e:
                print(f"Failed to initialize client for {instance['url']}: {e}")
    
    def multi_search(self, query: str, group_size: int = 2, **kwargs) -> List[Dict]:
        """
        按组执行搜索,每组有指定数量的搜索引擎实例。如果一组有结果就返回,否则继续下一组。
        
        Args:
            query: 搜索查询
            group_size: 每组包含的搜索引擎实例数量
            **kwargs: 额外的搜索参数
        
        Returns:
            去重后的搜索结果列表
        """
        results = []
        self.search_stats = {client.base_url: 0 for client in self.clients}  # 重置统计
        print(f"搜索{len(self.clients)}个实例")
        # 将clients分组
        client_groups = [self.clients[i:i+group_size] for i in range(0, len(self.clients), group_size)]
        
        for group_idx, client_group in enumerate(client_groups):
            group_results = []
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=len(client_group)) as executor:
                future_to_client = {
                    executor.submit(self._search_with_client, client, query, **kwargs): client 
                    for client in client_group
                }
                
                for future in concurrent.futures.as_completed(future_to_client):
                    client = future_to_client[future]
                    try:
                        client_results = future.result()
                        self.search_stats[client.base_url] = len(client_results)  # 更新统计
                        group_results.extend(client_results)
                    except Exception as e:
                        print(f"Error with client {client.base_url}: {e}")
            
            # 如果当前组有结果,就不再继续搜索下一组
            if group_results:
                print(f"\n第{group_idx + 1}组搜索成功")
                results = group_results
                break
            else:
                print(f"\n第{group_idx + 1}组搜索无结果,尝试下一组")
        
        # 打印每个实例的结果统计
        print("\n各搜索引擎结果统计:")
        for url, count in self.search_stats.items():
            print(f"- {url}: {count} 个结果")
        
        return self._deduplicate_results(results)
    
    def _search_with_client(self, client: 'SearXNGSeleniumClient', query: str, **kwargs) -> List[Dict]:
        """Perform search with a single client."""
        try:
            soup_results = client.search(query, **kwargs)
            return client.parse_results(soup_results)
        except Exception as e:
            print(f"Search failed for {client.base_url}: {e}")
            return []
    
    def _deduplicate_results(self, results: List[Dict]) -> List[Dict]:
        """Remove duplicate results based on URL."""
        seen_urls = set()
        unique_results = []
        
        for result in results:
            url = result.get('url')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_results.append(result)
        
        return unique_results
    
    def close(self):
        """Close all client instances."""
        for client in self.clients:
            try:
                client.close()
            except:
                pass

class SearXNGSeleniumClient:
    """
    A client for interacting with a SearXNG search engine instance using Selenium.
    """
    
    def __init__(self, base_url="https://search.inetol.net", timeout=10):
        """
        Initialize the SearXNG Selenium client.
        
        Args:
            base_url (str): The base URL of the SearXNG instance
            timeout (int): Timeout in seconds for page loading
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
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
            self.driver = webdriver.Chrome(options=options)
            self.driver.set_page_load_timeout(self.timeout)
        except Exception as e:
            print(f"Failed to initialize Chrome driver: {e}")
            print("Trying Firefox as fallback...")
            try:
                from selenium.webdriver.firefox.options import Options as FirefoxOptions
                firefox_options = FirefoxOptions()
                firefox_options.add_argument('--headless')
                self.driver = webdriver.Firefox(options=firefox_options)
                self.driver.set_page_load_timeout(self.timeout)
            except Exception as e2:
                print(f"Failed to initialize Firefox driver: {e2}")
                print("Please ensure you have either Chrome or Firefox and the appropriate WebDriver installed.")
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
    
    def search(self, query, category='general', language='auto', time_range='', page=1):
        """
        Perform a search query on the SearXNG instance.
        
        Args:
            query (str): The search query
            category (str): The search category (default: 'general')
            language (str): The language for results (default: 'auto')
            time_range (str): Time filter for results (default: '')
            page (int): Results page number (default: 1)
        
        Returns:
            BeautifulSoup object with the parsed HTML results
        """
        try:
            # Construct the search URL
            search_params = {
                'q': query
            }
            
            # Add optional parameters
            if category:
                search_params[f'category_{category}'] = '1'
            if language:
                search_params['language'] = language
            if time_range:
                search_params['time_range'] = time_range
            if page > 1:
                search_params['pageno'] = str(page)
            
            # Build the query string
            query_string = '&'.join([f"{k}={urllib.parse.quote(v)}" for k, v in search_params.items()])
            search_url = f"{self.base_url}/search?{query_string}"
            
            print(f"Navigating to search URL: {search_url}")
            self.driver.get(search_url)
            
            # Wait for results to load
            try:
                # Wait for results container or search input to confirm page loaded
                WebDriverWait(self.driver, self.timeout).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '.result, #q'))
                )
            except TimeoutException:
                print("Timeout waiting for search results. Page may have different structure.")
                # Continue anyway since we'll check the page content
            
            # Get the page source after it's loaded
            html = self.driver.page_source
            
            # Check for error messages or blocks
            if "429" in html and "Too Many Requests" in html:
                print("Received 429 Too Many Requests in response.")
                # Take a screenshot for debugging if possible
                try:
                    screenshot_path = "search_error.png"
                    self.driver.save_screenshot(screenshot_path)
                    print(f"Screenshot saved to {os.path.abspath(screenshot_path)}")
                except Exception as e:
                    print(f"Failed to save screenshot: {e}")
                
                if "security policies" in html:
                    print("Server security policies are blocking automated access.")
                    print("Consider using a different SearXNG instance or waiting longer between requests.")
            
            # Return the BeautifulSoup object regardless, for further analysis
            return BeautifulSoup(html, 'html.parser')
            
        except Exception as e:
            print(f"Error during search: {e}")
            # Take a screenshot if possible
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


# Example usage
if __name__ == "__main__":
    try:
        # 创建多搜索引擎客户端实例
        multi_client = MultiSearXClient(max_instances=10)
        
        # 搜索查询
        query = "openai 最新的新闻"
        print(f"使用多个搜索引擎实例搜索: {query}")
        
        # 执行并行搜索
        results = multi_client.multi_search(query)
        
        # 打印结果
        print(f"\n找到 {len(results)} 个去重后的结果:")
        
        if results:
            for i, result in enumerate(results, 1):
                print(f"\n--- 结果 {i} ---")
                print(f"标题: {result.get('title', 'N/A')}")
                print(f"URL: {result.get('url', 'N/A')}")
                content = result.get('content', 'N/A')
                print(f"内容: {content[:100]}..." if len(content) > 100 else f"内容: {content}")
        else:
            print("未找到结果。")
    
    except Exception as e:
        print(f"示例运行出错: {e}")
    
    finally:
        # 确保关闭所有浏览器
        if 'multi_client' in locals():
            multi_client.close()
            print("所有浏览器已关闭。")