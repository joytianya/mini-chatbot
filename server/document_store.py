from langchain_community.document_loaders import DirectoryLoader, TextLoader, PyPDFLoader, UnstructuredWordDocumentLoader
from langchain_community.document_loaders.markdown import UnstructuredMarkdownLoader
from langchain_community.document_loaders.pdf import PyPDFLoader
from langchain_community.document_loaders.word_document import UnstructuredWordDocumentLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from openai import OpenAI
from langchain_community.vectorstores import FAISS
import os
from dotenv import load_dotenv
import numpy as np
import hashlib
from pathlib import Path
import json

# 加载环境变量
load_dotenv()

class ArkEmbeddings:
    def __init__(self, api_key, base_url, model_name):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.model_name = model_name
    
    def __call__(self, text):
        """使类实例可调用，用于兼容 FAISS 的接口"""
        if isinstance(text, str):
            return self.embed_query(text)
        elif isinstance(text, list):
            return self.embed_documents(text)
        else:
            raise ValueError(f"Unsupported input type: {type(text)}")
    
    def embed_documents(self, texts):
        """将文档转换为向量"""
        print(f"\n正在生成 {len(texts)} 个文档的向量...")
        # 分批处理，每批最多 10 个文档
        batch_size = 10
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            print(f"处理第 {i//batch_size + 1} 批，共 {len(batch_texts)} 个文档")
            
            try:
                response = self.client.embeddings.create(
                    model=self.model_name,
                    input=batch_texts,
                    encoding_format="float"
                )
                batch_embeddings = [embedding.embedding for embedding in response.data]
                all_embeddings.extend(batch_embeddings)
            except Exception as e:
                print(f"处理批次 {i//batch_size + 1} 时出错: {str(e)}")
                raise
        
        print(f"向量生成完成，共 {len(all_embeddings)} 个向量")
        return all_embeddings
    
    def embed_query(self, text):
        """将查询转换为向量"""
        response = self.client.embeddings.create(
            model=os.getenv('ARK_EMBEDDING_MODEL'),
            input=[text],
            encoding_format="float"
        )
        return response.data[0].embedding

class DocumentStore:
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DocumentStore, cls).__new__(cls)
        return cls._instance

    def __init__(self, api_key, base_url, model_name):
        if not self._initialized:
            self.embeddings = ArkEmbeddings(
                api_key=api_key,
                base_url=base_url,
                model_name=model_name
            )
            self.vector_store = None
            self.index_dir = Path("faiss_index")  # 索引存储目录
            self.file_hashes = {}  # 文件路径到哈希的映射
            
            # 创建必要的目录
            self.index_dir.mkdir(exist_ok=True)
            self._load_existing_hashes()
            
            # 尝试加载已有的向量存储
            try:
                self._load_vector_store()
                print("成功加载已有的向量存储")
            except Exception as e:
                print(f"加载向量存储失败: {str(e)}")
            
            self._initialized = True
            
    def _file_hash(self, file_path):
        """计算文件的 SHA256 哈希"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    def _load_existing_hashes(self):
        """加载已有的哈希记录"""
        hash_file = self.index_dir / "file_hashes.json"
        if hash_file.exists():
            with open(hash_file) as f:
                self.file_hashes = json.load(f)

    def _save_hashes(self):
        """保存哈希记录"""
        hash_file = self.index_dir / "file_hashes.json"
        with open(hash_file, "w") as f:
            json.dump(self.file_hashes, f)

    def process_single_file(self, file_path):
        """处理单个文件"""
        print(f"\n处理文件: {file_path}")
        
        # 获取文件类型和对应的加载器
        ext = Path(file_path).suffix.lower()
        loaders = {
            '.txt': TextLoader,
            '.pdf': PyPDFLoader,
            '.doc': UnstructuredWordDocumentLoader,
            '.docx': UnstructuredWordDocumentLoader,
            '.md': UnstructuredMarkdownLoader,
        }
        
        loader_cls = loaders.get(ext)
        if not loader_cls:
            raise ValueError(f"不支持的文件类型: {ext}")
        
        try:
            # 计算文件哈希
            current_hash = self._file_hash(file_path)
            
            # 检查文件是否已经处理过且未修改
            if self.file_hashes.get(file_path) == current_hash:
                print(f"文件未修改，使用缓存的向量索引")
                self._load_vector_store()
                return {
                    "success": True,
                    "document_id": current_hash
                }
            
            # 加载文档
            if loader_cls == TextLoader:
                loader = loader_cls(file_path, encoding='utf-8')
            else:
                loader = loader_cls(file_path)
            documents = loader.load()
            
            if not documents:
                raise ValueError("文档加载失败")
            
            # 更新哈希
            self.file_hashes = {file_path: current_hash}  # 只保存当前文件
            
            # 切分文档
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            texts = text_splitter.split_documents(documents)
            
            if not texts:
                raise ValueError("文档切分失败")
            
            print(f"处理 {len(texts)} 个文本块...")
            
            # 创建新的向量存储
            self.vector_store = FAISS.from_documents(texts, self.embeddings)
            
            # 保存向量存储和哈希
            self._save_vector_store()
            self._save_hashes()
            
            print("向量存储更新完成")
            return {
                "success": True,
                "document_id": current_hash
            }
            
        except Exception as e:
            print(f"处理文件时出错: {str(e)}")
            return {
                "success": False,
                "document_id": None
            }

    def load_documents(self, directory_path):
        """已弃用，请使用 process_single_file"""
        raise NotImplementedError("请使用 process_single_file 处理单个文件")

    def _save_vector_store(self):
        """保存向量存储到磁盘"""
        if self.vector_store:
            index_path = self.index_dir / "current_index"
            self.vector_store.save_local(index_path)
            print(f"向量索引已保存到: {index_path}")

    def _load_vector_store(self):
        """从磁盘加载向量存储"""
        index_path = self.index_dir / "current_index"
        if index_path.exists():
            self.vector_store = FAISS.load_local(
                index_path, 
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            print(f"已加载缓存的向量索引: {index_path}")
        else:
            raise ValueError("没有找到缓存的向量索引")

    def search(self, query, k=3):
        if not self.vector_store:
            return []
        return self.vector_store.similarity_search(query, k=k)

    def clear(self):
        """清空向量存储"""
        self.vector_store = None
        # 清空缓存
        self.file_hashes = {}
        if self.index_dir.exists():
            for f in self.index_dir.glob("*"):
                f.unlink()
        print("向量存储已清空")