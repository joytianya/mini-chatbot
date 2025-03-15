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
import logging

# 加载环境变量
load_dotenv()

# 配置日志记录
logger = logging.getLogger('document_store')
logger.setLevel(logging.INFO)

# 移除可能存在的重复处理器
for h in logger.handlers[:]:
    logger.removeHandler(h)

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
        logger.info(f"正在生成 {len(texts)} 个文档的向量...")
        # 分批处理，每批最多 10 个文档
        batch_size = 10
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            logger.info(f"处理第 {i//batch_size + 1} 批，共 {len(batch_texts)} 个文档")
            
            try:
                # 确保文本是UTF-8编码
                encoded_texts = []
                for text in batch_texts:
                    if isinstance(text, str):
                        # 如果是字符串，确保是UTF-8编码
                        encoded_text = text.encode('utf-8').decode('utf-8')
                    else:
                        # 如果不是字符串，转换为字符串
                        encoded_text = str(text).encode('utf-8').decode('utf-8')
                    encoded_texts.append(encoded_text)

                response = self.client.embeddings.create(
                    model=self.model_name,
                    input=encoded_texts,
                    encoding_format="float"
                )
                batch_embeddings = [embedding.embedding for embedding in response.data]
                all_embeddings.extend(batch_embeddings)
            except Exception as e:
                logger.error(f"处理批次 {i//batch_size + 1} 时出错: {str(e)}")
                raise
        
        logger.info(f"向量生成完成，共 {len(all_embeddings)} 个向量")
        return all_embeddings
    
    def embed_query(self, text):
        """将查询转换为向量"""
        try:
            # 确保查询文本是UTF-8编码
            encoded_text = text.encode('utf-8').decode('utf-8') if isinstance(text, str) else str(text).encode('utf-8').decode('utf-8')
            
            response = self.client.embeddings.create(
                model=self.model_name,
                input=[encoded_text],
                encoding_format="float"
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"生成查询向量时出错: {str(e)}")
            raise

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
            self.vector_stores = {}  # 使用字典存储多个向量存储，键为文件哈希
            self.index_dir = Path("faiss_index")  # 索引存储目录
            self.file_hashes = {}  # 文件路径到哈希的映射
            
            # 创建必要的目录
            self.index_dir.mkdir(exist_ok=True)
            self._load_existing_hashes()
            
            # 尝试加载已有的向量存储
            try:
                self._load_all_vector_stores()
                logger.info("成功加载已有的向量存储")
            except Exception as e:
                logger.error(f"加载向量存储失败: {str(e)}")
            
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

    def _load_all_vector_stores(self):
        """加载所有已存在的向量存储"""
        if not self.file_hashes:
            return
        
        for file_path, file_hash in self.file_hashes.items():
            try:
                index_path = self.index_dir / file_hash
                if index_path.exists():
                    self.vector_stores[file_hash] = FAISS.load_local(
                        str(index_path),
                        self.embeddings,
                        allow_dangerous_deserialization=True
                    )
                    logger.info(f"已加载索引: {file_hash} (文件: {file_path})")
            except Exception as e:
                logger.error(f"加载索引失败 {file_hash}: {str(e)}")
    
    def _save_vector_store(self, file_hash):
        """保存指定哈希的向量存储到磁盘"""
        if file_hash in self.vector_stores:
            index_path = self.index_dir / file_hash
            self.vector_stores[file_hash].save_local(str(index_path))
            logger.info(f"向量索引已保存到: {index_path}")

    def _load_vector_store(self, file_hash):
        """从磁盘加载指定哈希的向量存储"""
        index_path = self.index_dir / file_hash
        if index_path.exists():
            self.vector_stores[file_hash] = FAISS.load_local(
                str(index_path),
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            logger.info(f"已加载缓存的向量索引: {file_hash}")
            return True
        else:
            logger.warning(f"没有找到缓存的向量索引: {file_hash}")
            return False

    def process_single_file(self, file_path):
        """处理单个文件"""
        logger.info(f"处理文件: {file_path}")
        
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
            logger.error(f"不支持的文件类型: {ext}")
            raise ValueError(f"不支持的文件类型: {ext}")
        
        try:
            # 计算文件哈希
            current_hash = self._file_hash(file_path)
            
            # 检查文件是否已经处理过且未修改
            if self.file_hashes.get(file_path) == current_hash and current_hash in self.vector_stores:
                logger.info(f"文件未修改，使用缓存的向量索引: {current_hash}")
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
                logger.error("文档加载失败")
                raise ValueError("文档加载失败")
            
            # 更新哈希映射
            self.file_hashes[file_path] = current_hash
            
            # 切分文档
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            texts = text_splitter.split_documents(documents)
            
            if not texts:
                logger.error("文档切分失败")
                raise ValueError("文档切分失败")
            
            logger.info(f"处理 {len(texts)} 个文本块...")
            
            # 创建新的向量存储
            self.vector_stores[current_hash] = FAISS.from_documents(texts, self.embeddings)
            
            # 保存向量存储和哈希
            self._save_vector_store(current_hash)
            self._save_hashes()
            
            logger.info("向量存储更新完成")
            return {
                "success": True,
                "document_id": current_hash
            }
            
        except Exception as e:
            logger.error(f"处理文件时出错: {str(e)}")
            return {
                "success": False,
                "document_id": None
            }

    def search(self, query, k=3, document_id=None):
        """在向量存储中搜索
        
        Args:
            query: 搜索查询
            k: 返回结果数量
            document_id: 文件哈希值，如果指定则只在该文件的索引中搜索，否则搜索所有索引
        """
        if not self.vector_stores:
            logger.warning("没有可用的向量存储")
            return []
        
        all_results = []
        if document_id:
            # 只在指定文档中搜索
            if document_id not in self.vector_stores:
                logger.warning(f"未找到指定文档的向量存储: {document_id}")
                return []
            try:
                results = self.vector_stores[document_id].similarity_search(query, k=k)
                all_results.extend(results)
                logger.info(f"在文档 {document_id} 中找到 {len(results)} 个相关片段")
            except Exception as e:
                logger.error(f"搜索向量存储 {document_id} 时出错: {str(e)}")
        else:
            # 在所有文档中搜索
            for file_hash, vector_store in self.vector_stores.items():
                try:
                    results = vector_store.similarity_search(query, k=k)
                    all_results.extend(results)
                    logger.info(f"在文档 {file_hash} 中找到 {len(results)} 个相关片段")
                except Exception as e:
                    logger.error(f"搜索向量存储 {file_hash} 时出错: {str(e)}")
        
        # 按相关性排序并返回前k个结果
        return sorted(all_results, key=lambda x: x.metadata.get('score', 0), reverse=True)[:k]

    def clear(self):
        """清空向量存储"""
        self.vector_stores = {}
        self.file_hashes = {}
        if self.index_dir.exists():
            for f in self.index_dir.glob("*"):
                f.unlink()
        logger.info("向量存储已清空")