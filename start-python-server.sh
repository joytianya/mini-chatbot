#!/bin/bash

cd server

# 检查端口是否被占用
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "端口 5001 已被占用,正在关闭..."
    lsof -ti :5001 | xargs kill -9
    echo "已关闭占用端口 5001 的进程"
fi
# 检查 app.py 进程是否在运行
if pgrep -f "python app.py" > /dev/null; then
    echo "检测到 app.py 进程正在运行,正在关闭..."
    pkill -f "python app.py"
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
pip install pypdf unstructured python-docx markdown
#brew install libmagic  # macOS
# 检查 documents 目录是否存在
if [ ! -d "documents" ]; then
    echo "Creating documents directory..."
    mkdir documents
fi

# 确保日志目录存在
mkdir -p logs

# 启动 Flask 服务器
echo "Starting Flask server..."
python app.py > logs/flask.log 2>&1 &

# 等待服务器启动
echo "等待服务器启动..."
sleep 2

# 检查服务器是否成功启动
if curl -s http://localhost:5001/api/test > /dev/null; then
    echo "Flask 服务器已成功启动"
    tail -f logs/flask.log
else
    echo "错误: Flask 服务器启动失败"
    cat logs/flask.log
    exit 1
fi 