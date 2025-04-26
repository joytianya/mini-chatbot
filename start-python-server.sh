#!/bin/bash

# 设置 UTF-8 编码环境变量
export PYTHONIOENCODING=UTF-8
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

# 切换到服务器目录
cd server

# 检查是否存在 virtualenv
if [ -d "venv" ]; then
    echo "激活虚拟环境..."
    source venv/bin/activate
fi

# 启动 Flask 服务器
python -m app

# 如果以上命令失败，尝试以下备用命令
# python app.py
# 或者如果使用 gunicorn:
# gunicorn -b 0.0.0.0:5001 app:app 