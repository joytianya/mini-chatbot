from document_store import DocumentStore
import os

def test_document_store():
    print("\n=== 开始测试 DocumentStore ===")
    
    # 初始化 DocumentStore
    doc_store = DocumentStore()
    print("1. DocumentStore 初始化成功")
    
    # 创建测试文档
    if not os.path.exists('documents'):
        os.makedirs('documents')
    
    test_docs = [
        ("test1.txt", """这是第一个测试文档。
主要介绍Python编程：
1. Python是一种高级编程语言
2. Python支持面向对象编程
3. Python有丰富的库和框架"""),
        
        ("test2.txt", """这是第二个测试文档。
介绍机器学习相关内容：
1. 机器学习是AI的一个分支
2. 深度学习是机器学习的一部分
3. 神经网络是深度学习的基础"""),
        
        ("test3.txt", """这是第三个测试文档。
讨论RAG（检索增强生成）：
1. RAG结合了检索和生成
2. 可以提高AI回答的准确性
3. 适合处理特定领域的问题""")
    ]
    
    # 写入测试文档
    print("\n2. 创建测试文档...")
    for filename, content in test_docs:
        with open(f'documents/{filename}', 'w', encoding='utf-8') as f:
            f.write(content)
    print(f"已创建 {len(test_docs)} 个测试文档")
    
    # 加载文档
    print("\n3. 测试文档加载...")
    doc_store.load_documents('documents')
    
    # 测试搜索功能
    print("\n4. 测试搜索功能...")
    test_queries = [
        "Python有什么特点？",
        "什么是机器学习？",
        "RAG是什么技术？"
    ]
    
    for query in test_queries:
        print(f"\n查询: {query}")
        results = doc_store.search(query, k=2)
        print(f"找到 {len(results)} 个相关文档片段:")
        for i, doc in enumerate(results, 1):
            print(f"\n结果 {i}:")
            print(doc.page_content)
    
    # 测试清空功能
    print("\n5. 测试清空功能...")
    doc_store.clear()
    results = doc_store.search("测试查询")
    assert len(results) == 0, "清空后仍能搜索到结果"
    print("清空功能测试通过")
    
    # 清理测试文件
    print("\n6. 清理测试文件...")
    for filename, _ in test_docs:
        os.remove(f'documents/{filename}')
    print("测试文件已清理")
    
    print("\n=== DocumentStore 测试完成 ===")

if __name__ == '__main__':
    test_document_store() 