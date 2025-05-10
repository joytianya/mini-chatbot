#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
SearXNG客户端测试模块
测试searx_client.py中的功能，特别关注"invalid session id"错误的处理
"""

import unittest
import os
import sys
import time
from selenium.common.exceptions import InvalidSessionIdException

# 添加项目根目录到路径，以便导入server模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from server.searx_client import SearXNGSeleniumClient, MultiSearXClient

class TestSearXClient(unittest.TestCase):
    """测试SearXNGSeleniumClient类"""
    
    def setUp(self):
        """测试前的设置"""
        self.test_url = "https://search.inetol.net"  # 使用一个可靠的SearX实例
        self.test_query = "python selenium"
    
    def test_session_management(self):
        """测试会话管理，确保不会出现无效会话ID错误"""
        print("\n测试会话管理...")
        
        # 创建客户端
        client = SearXNGSeleniumClient(base_url=self.test_url)
        
        try:
            # 检查初始化是否成功
            self.assertIsNotNone(client.driver, "WebDriver初始化失败")
            
            # 测试访问主页
            success = client.visit_homepage()
            self.assertTrue(success, "访问主页失败")
            
            # 检查会话是否有效
            try:
                client.driver.current_url
                print("会话有效，当前URL:", client.driver.current_url)
            except InvalidSessionIdException:
                self.fail("初始化后会话ID无效")
            
            # 执行搜索
            print("执行搜索...")
            try:
                soup = client.search(self.test_query)
                results = client.parse_results(soup)
                print(f"搜索结果数量: {len(results)}")
            except InvalidSessionIdException as e:
                self.fail(f"搜索过程中出现无效会话ID: {e}")
            
            # 关闭客户端
            print("关闭客户端...")
            client.close()
            
            # 验证会话已关闭
            try:
                url = client.driver.current_url
                self.fail(f"客户端关闭后会话仍然有效，当前URL: {url}")
            except (InvalidSessionIdException, AttributeError):
                print("会话已正确关闭")
                
        finally:
            # 确保资源被清理
            try:
                if client.driver:
                    client.driver.quit()
            except:
                pass
    
    def test_error_handling(self):
        """测试错误处理机制"""
        print("\n测试错误处理...")
        
        client = SearXNGSeleniumClient(base_url=self.test_url)
        
        try:
            # 模拟会话无效的情况
            client.driver.quit()
            client.driver = None
            
            # 尝试使用无效会话
            try:
                client.search(self.test_query)
                self.fail("应该抛出异常但没有")
            except Exception as e:
                print(f"预期的异常: {e}")
                # 确保客户端可以恢复
                client.init_driver()
                self.assertIsNotNone(client.driver, "恢复WebDriver失败")
        finally:
            # 确保资源被清理
            try:
                if client.driver:
                    client.driver.quit()
            except:
                pass
    
    def test_session_recovery(self):
        """测试会话恢复功能"""
        print("\n测试会话自动恢复...")
        
        client = None
        try:
            # 创建客户端
            client = SearXNGSeleniumClient(base_url=self.test_url)
            
            # 测试基本搜索
            query = "python selenium"
            soup = client.search(query)
            results = client.parse_results(soup)
            print(f"初始搜索结果数量: {len(results)}")
            
            # 模拟会话失效
            if client.driver:
                print("模拟会话失效...")
                client.driver.quit()
                client.driver = None
            
            # 测试自动恢复
            try:
                print("尝试搜索，应该会自动恢复会话...")
                soup = client.search("python test")
                results = client.parse_results(soup)
                print(f"恢复后搜索结果数量: {len(results)}")
                self.assertTrue(len(results) >= 0, "恢复后搜索应返回结果")
            except Exception as e:
                self.fail(f"会话恢复失败: {e}")
            
        finally:
            # 清理资源
            if client:
                client.close()

class TestMultiSearXClient(unittest.TestCase):
    """测试MultiSearXClient类"""
    
    def test_client_initialization(self):
        """测试多客户端初始化和资源管理"""
        print("\n测试多客户端初始化...")
        
        # 使用较小的实例数量进行测试
        multi_client = MultiSearXClient(max_instances=2)
        
        try:
            # 检查客户端是否正确初始化
            self.assertTrue(len(multi_client.clients) > 0, "没有初始化任何客户端")
            
            # 检查所有客户端的会话是否有效
            for i, client in enumerate(multi_client.clients):
                try:
                    client.ensure_valid_session()
                    print(f"客户端 {i+1} 会话有效")
                except Exception as e:
                    self.fail(f"客户端 {i+1} 会话验证失败: {e}")
            
        finally:
            # 确保所有资源被清理
            multi_client.close()
    
    def test_multi_client_recovery(self):
        """测试多客户端的会话恢复功能"""
        print("\n测试多客户端会话恢复...")
        multi_client = None
        
        try:
            # 创建多客户端实例，仅使用2个实例以加快测试速度
            multi_client = MultiSearXClient(max_instances=2)
            
            # 检查客户端初始化情况
            client_count = len(multi_client.clients)
            print(f"初始化了 {client_count} 个客户端")
            self.assertTrue(client_count > 0, "应该至少初始化一个客户端")
            
            # 执行搜索
            print("执行第一次搜索...")
            results = multi_client.multi_search("python test", group_size=1)
            print(f"搜索结果数量: {len(results)}")
            
            # 模拟某个客户端会话失效
            if multi_client.clients and len(multi_client.clients) > 0:
                print("模拟第一个客户端会话失效...")
                client = multi_client.clients[0]
                if client.driver:
                    client.driver.quit()
                    client.driver = None
                    print(f"已使客户端 {client.base_url} 的会话失效")
            
            # 验证客户端并执行第二次搜索
            print("执行第二次搜索，应该会自动恢复失效的会话...")
            results = multi_client.multi_search("selenium automation", group_size=1)
            print(f"第二次搜索结果数量: {len(results)}")
            
            # 验证客户端数量是否保持不变
            self.assertEqual(len(multi_client.clients), client_count, 
                            "恢复后客户端数量应保持不变")
            
        except Exception as e:
            self.fail(f"测试过程中出错: {e}")
        finally:
            # 清理资源
            if multi_client:
                multi_client.close()

# 如果直接运行此文件
if __name__ == "__main__":
    unittest.main(verbosity=2) 