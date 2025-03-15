#!/bin/bash

cd server

# 设置端口为5001
export PORT=5001

# 检查 app.py 进程是否在运行（更精确的匹配）
if ps aux | grep "[P]ython.*app\.py" > /dev/null; then
    echo "检测到 app.py 进程正在运行,正在关闭..."
    # 使用更精确的模式来终止进程
    pkill -f "[P]ython.*app\.py"
    # 等待进程完全终止
    sleep 2
    echo "已关闭 app.py 进程"
fi

# 检查 Python 虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "Installing Python dependencies..."
pip install "flask[async]" flask-cors langchain-community langchain openai faiss-cpu python-dotenv "httpx[socks]" tiktoken
pip install pypdf unstructured python-docx markdown crawl4ai selenium
python -m playwright install --with-deps chromium

pip install -r requirements.txt
#brew install libmagic  # macOS

# 检查 documents 目录是否存在
if [ ! -d "documents" ]; then
    echo "Creating documents directory..."
    mkdir documents
fi

# 确保日志目录存在
mkdir -p logs

# 启动 Flask 服务器（直接在前台运行）
echo "Starting Flask server in debug mode..."
FLASK_ENV=development python app.py 