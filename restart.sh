#!/bin/bash

# 创建日志目录
mkdir -p logs

# 获取当前时间戳作为日志文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKEND_LOG="logs/backend_${TIMESTAMP}.log"
FRONTEND_LOG="logs/frontend_${TIMESTAMP}.log"

# 检查并终止已运行的服务器进程
echo "检查并关闭已运行的进程..."
if ps aux | grep "[P]ython.*app\.py" > /dev/null; then
    echo "关闭后端服务..."
    pkill -f "[P]ython.*app\.py"
    sleep 2
fi

if ps aux | grep "[n]ode.*vite" > /dev/null; then
    echo "关闭前端服务..."
    pkill -f "[n]ode.*vite"
    sleep 2
fi

# 准备后端
echo "准备启动后端服务..."
cd server

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装后端依赖
echo "正在安装后端依赖..."
pip install -r requirements.txt >> "../${BACKEND_LOG}" 2>&1

# 确保目录存在
mkdir -p documents
mkdir -p logs

# 在后台启动后端服务并重定向日志
echo "正在启动后端服务..."
(export PORT=5001 && export FLASK_ENV=development && python app.py >> "../${BACKEND_LOG}" 2>&1) &
BACKEND_PID=$!
echo "后端服务(PID: $BACKEND_PID)已启动，日志保存在 ${BACKEND_LOG}"

# 返回项目根目录
cd ..

# 准备前端
echo "准备启动前端服务..."
cd client

# 安装前端依赖
echo "正在安装前端依赖..."
npm install --legacy-peer-deps >> "../${FRONTEND_LOG}" 2>&1

# 在后台启动前端服务并重定向日志
echo "正在启动前端服务..."
(npm run dev >> "../${FRONTEND_LOG}" 2>&1) &
FRONTEND_PID=$!
echo "前端服务(PID: $FRONTEND_PID)已启动，日志保存在 ${FRONTEND_LOG}"

cd ..

# 打印访问信息
echo ""
echo "服务已启动:"
echo "- 前端地址: http://localhost:5173"
echo "- 后端地址: http://localhost:5001"
echo ""
echo "日志文件:"
echo "- 前端日志: ${FRONTEND_LOG}"
echo "- 后端日志: ${BACKEND_LOG}"
echo ""
echo "按Ctrl+C关闭服务"

# 等待用户中断
trap "echo '正在关闭服务...' && kill $FRONTEND_PID $BACKEND_PID 2>/dev/null" EXIT
wait