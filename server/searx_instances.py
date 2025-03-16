import requests
import json
from typing import Dict, List
from operator import itemgetter

class SearxSpaceParser:
    def __init__(self):
        self.base_url = "https://searx.space/data/instances.json"
        
    def fetch_instances(self) -> Dict:
        """获取实例数据"""
        try:
            response = requests.get(self.base_url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"获取实例数据失败: {e}")
            return {}
            
    def parse_and_save_instances(self, output_file: str = "searx_instances_sorted.json"):
        """解析实例数据并保存为排序后的JSON文件"""
        data = self.fetch_instances()
        if not data:
            print("未获取到任何实例信息")
            return
            
        # 提取实例信息并添加排序键
        instances_list = []
        for url, info in data.get("instances", {}).items():
            if info.get("error"):
                continue
                
            # 获取搜索mean值，如果不存在则设为无穷大（排在最后）
            search_mean = float('inf')
            try:
                search_mean = info.get("timing", {}).get("search", {}).get("all", {}).get("mean", float('inf'))
            except (TypeError, AttributeError):
                pass
                
            # 保存完整实例信息
            instance_info = {
                "url": url,
                "search_mean": search_mean,
                **info  # 保留原始数据的所有字段
            }
            instances_list.append(instance_info)
        
        # 按search mean值倒序排序
        sorted_instances = sorted(instances_list, 
                                key=lambda x: x["search_mean"] if x["search_mean"] != float('inf') else float('inf'),
                                reverse=False)
        
        # 保存为JSON文件
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(sorted_instances, f, ensure_ascii=False, indent=2)
            
        print(f"已保存 {len(sorted_instances)} 个实例信息到 {output_file}")
        print(sorted_instances[:1])
        # 打印前10个实例的基本信息
        print("\n前10个响应最快的实例：")
        for idx, instance in enumerate(sorted_instances[:10]):
            print(f"{idx}. URL: {instance['url']}")
            print(f"   版本: {instance.get('version', '未知')}")
            print(f"   搜索平均响应时间: {instance['search_mean']:.3f}s" 
                  if instance['search_mean'] != float('inf') else "   搜索平均响应时间: 未知")
            print()

def main():
    parser = SearxSpaceParser()
    parser.parse_and_save_instances()

if __name__ == "__main__":
    main() 