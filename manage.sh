#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"
LOGS_DIR="${SCRIPT_DIR}/logs"

# 确保目录存在
mkdir -p "${LOGS_DIR}"
mkdir -p "${SCRIPTS_DIR}"

# 获取当前时间戳作为日志文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKEND_LOG="${LOGS_DIR}/backend_${TIMESTAMP}.log"
FRONTEND_LOG="${LOGS_DIR}/frontend_${TIMESTAMP}.log"
BACKEND_LATEST_LOG="${LOGS_DIR}/backend_latest.log"
FRONTEND_LATEST_LOG="${LOGS_DIR}/frontend_latest.log"

# 进程ID文件
PID_FILE="${SCRIPT_DIR}/.chatbot_pids"

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查服务状态
check_status() {
    local backend_running=false
    local frontend_running=false
    
    if ps aux | grep "[P]ython.*app\.py" > /dev/null; then
        backend_running=true
    fi
    
    if ps aux | grep "[n]ode.*vite" > /dev/null; then
        frontend_running=true
    fi
    
    print_message "${BLUE}" "服务状态:"
    
    if $backend_running; then
        print_message "${GREEN}" "- 后端服务: 运行中"
        local backend_pid=$(pgrep -f "[P]ython.*app\.py")
        echo "  PID: ${backend_pid}"
    else
        print_message "${RED}" "- 后端服务: 未运行"
    fi
    
    if $frontend_running; then
        print_message "${GREEN}" "- 前端服务: 运行中"
        local frontend_pid=$(pgrep -f "[n]ode.*vite")
        echo "  PID: ${frontend_pid}"
    else
        print_message "${RED}" "- 前端服务: 未运行"
    fi
    
    if $backend_running || $frontend_running; then
        echo ""
        print_message "${BLUE}" "访问地址:"
        if $frontend_running; then
            print_message "${GREEN}" "- 前端地址: http://localhost:5173"
        fi
        if $backend_running; then
            print_message "${GREEN}" "- 后端地址: http://localhost:5001"
        fi
    fi
}

# 启动后端服务
start_backend() {
    print_message "${BLUE}" "准备启动后端服务..."
    
    # 切换到服务器目录
    cd "${SCRIPT_DIR}/server"
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        print_message "${YELLOW}" "创建Python虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装后端依赖
    print_message "${YELLOW}" "正在安装后端依赖..."
    pip install -r requirements.txt >> "${BACKEND_LOG}" 2>&1
    
    # 确保目录存在
    mkdir -p documents
    mkdir -p logs
    
    # 在后台启动后端服务并重定向日志
    print_message "${GREEN}" "正在启动后端服务..."
    (export PORT=5001 && export FLASK_ENV=development && python app.py >> "${BACKEND_LOG}" 2>&1) &
    BACKEND_PID=$!
    
    # 保存PID
    echo "BACKEND_PID=${BACKEND_PID}" > "${PID_FILE}"
    
    # 创建指向最新日志的符号链接
    ln -sf "${BACKEND_LOG}" "${BACKEND_LATEST_LOG}"
    
    print_message "${GREEN}" "后端服务(PID: ${BACKEND_PID})已启动，日志保存在 ${BACKEND_LOG}"
    print_message "${GREEN}" "最新日志符号链接: ${BACKEND_LATEST_LOG}"
    
    # 返回项目根目录
    cd "${SCRIPT_DIR}"
}

# 启动前端服务
start_frontend() {
    print_message "${BLUE}" "准备启动前端服务..."
    
    # 切换到客户端目录
    cd "${SCRIPT_DIR}/client"
    
    # 安装前端依赖
    print_message "${YELLOW}" "正在安装前端依赖..."
    npm install --legacy-peer-deps >> "${FRONTEND_LOG}" 2>&1
    
    # 在后台启动前端服务并重定向日志
    print_message "${GREEN}" "正在启动前端服务..."
    (npm run dev >> "${FRONTEND_LOG}" 2>&1) &
    FRONTEND_PID=$!
    
    # 保存PID
    if [ -f "${PID_FILE}" ]; then
        source "${PID_FILE}"
        echo -e "BACKEND_PID=${BACKEND_PID}\nFRONTEND_PID=${FRONTEND_PID}" > "${PID_FILE}"
    else
        echo "FRONTEND_PID=${FRONTEND_PID}" > "${PID_FILE}"
    fi
    
    # 创建指向最新日志的符号链接
    ln -sf "${FRONTEND_LOG}" "${FRONTEND_LATEST_LOG}"
    
    print_message "${GREEN}" "前端服务(PID: ${FRONTEND_PID})已启动，日志保存在 ${FRONTEND_LOG}"
    print_message "${GREEN}" "最新日志符号链接: ${FRONTEND_LATEST_LOG}"
    
    # 返回项目根目录
    cd "${SCRIPT_DIR}"
}

# 停止服务
stop_services() {
    local force=$1
    local backend_stopped=false
    local frontend_stopped=false
    
    # 检查并终止已运行的服务器进程
    print_message "${BLUE}" "检查并关闭已运行的进程..."
    
    if ps aux | grep "[P]ython.*app\.py" > /dev/null; then
        print_message "${YELLOW}" "关闭后端服务..."
        if [ "$force" = "force" ]; then
            pkill -9 -f "[P]ython.*app\.py"
        else
            pkill -f "[P]ython.*app\.py"
        fi
        backend_stopped=true
        sleep 2
    fi
    
    if ps aux | grep "[n]ode.*vite" > /dev/null; then
        print_message "${YELLOW}" "关闭前端服务..."
        if [ "$force" = "force" ]; then
            pkill -9 -f "[n]ode.*vite"
        else
            pkill -f "[n]ode.*vite"
        fi
        frontend_stopped=true
        sleep 2
    fi
    
    if $backend_stopped && $frontend_stopped; then
        print_message "${GREEN}" "所有服务已停止"
    elif $backend_stopped; then
        print_message "${GREEN}" "后端服务已停止"
    elif $frontend_stopped; then
        print_message "${GREEN}" "前端服务已停止"
    else
        print_message "${YELLOW}" "没有发现正在运行的服务"
    fi
    
    # 清除PID文件
    if [ -f "${PID_FILE}" ]; then
        rm "${PID_FILE}"
    fi
}

# 查看日志
view_logs() {
    local log_type=$1
    local lines=${2:-50}
    
    if [ "$log_type" = "backend" ]; then
        if [ -f "${BACKEND_LATEST_LOG}" ]; then
            print_message "${BLUE}" "显示最新的后端日志 (${BACKEND_LATEST_LOG}):"
            tail -n "$lines" "${BACKEND_LATEST_LOG}"
        else
        local latest_log=$(ls -t "${LOGS_DIR}"/backend_*.log 2>/dev/null | head -n 1)
        if [ -n "$latest_log" ]; then
            print_message "${BLUE}" "显示最新的后端日志 (${latest_log}):"
            tail -n "$lines" "$latest_log"
                # 创建符号链接
                ln -sf "$latest_log" "${BACKEND_LATEST_LOG}"
                print_message "${YELLOW}" "已创建符号链接: ${BACKEND_LATEST_LOG}"
        else
            print_message "${RED}" "没有找到后端日志文件"
            fi
        fi
    elif [ "$log_type" = "frontend" ]; then
        if [ -f "${FRONTEND_LATEST_LOG}" ]; then
            print_message "${BLUE}" "显示最新的前端日志 (${FRONTEND_LATEST_LOG}):"
            tail -n "$lines" "${FRONTEND_LATEST_LOG}"
        else
        local latest_log=$(ls -t "${LOGS_DIR}"/frontend_*.log 2>/dev/null | head -n 1)
        if [ -n "$latest_log" ]; then
            print_message "${BLUE}" "显示最新的前端日志 (${latest_log}):"
            tail -n "$lines" "$latest_log"
                # 创建符号链接
                ln -sf "$latest_log" "${FRONTEND_LATEST_LOG}"
                print_message "${YELLOW}" "已创建符号链接: ${FRONTEND_LATEST_LOG}"
        else
            print_message "${RED}" "没有找到前端日志文件"
            fi
        fi
    else
        print_message "${RED}" "未知的日志类型: ${log_type}"
        print_message "${YELLOW}" "可用选项: backend, frontend"
    fi
}

# 显示帮助信息
show_help() {
    print_message "${BLUE}" "Mini-Chatbot 管理脚本"
    echo ""
    print_message "${GREEN}" "用法: $0 [命令]"
    echo ""
    echo ""
    print_message "${YELLOW}" "可用命令:"
    echo "  start       启动前端和后端服务"
    echo "  start-backend  只启动后端服务"
    echo "  start-frontend 只启动前端服务"
    echo "  stop        停止所有服务"
    echo "  stop-force  强制停止所有服务(使用kill -9)"
    echo "  restart     重启所有服务"
    echo "  status      检查服务状态"
    echo "  logs        查看日志"
    echo "  test        运行测试脚本"
    echo "  help        显示此帮助信息"
    echo ""
    print_message "${YELLOW}" "日志命令:"
    echo "  logs backend [行数]   查看后端日志(默认50行)"
    echo "  logs frontend [行数]  查看前端日志(默认50行)"
    echo ""
    print_message "${YELLOW}" "测试命令:"
    echo "  test                  运行所有测试"
    echo "  test openrouter       运行 OpenRouter API 测试"
    echo "  test stream           运行 OpenRouter API 流式输出测试"
    echo "  test backend          运行后端测试"
    echo "  test frontend         运行前端测试"
    echo "  test update-logs      更新日志链接"
    echo "  test collect-tests    收集项目中的测试文件"
    echo ""
    print_message "${BLUE}" "示例:"
    echo "  $0 start            # 启动所有服务"
    echo "  $0 logs backend 100 # 查看后端最新100行日志"
    echo "  $0 test             # 运行所有测试"
    echo "  $0 test collect-tests # 收集项目中的测试文件"
}

# 主函数
main() {
    local command=$1
    shift
    
    case "$command" in
        start)
            stop_services
            start_backend
            start_frontend
            print_message "${GREEN}" "所有服务已启动"
            print_message "${BLUE}" "访问地址:"
            print_message "${GREEN}" "- 前端地址: http://localhost:5173"
            print_message "${GREEN}" "- 后端地址: http://localhost:5001"
            ;;
        start-backend)
            if ps aux | grep "[P]ython.*app\.py" > /dev/null; then
                print_message "${YELLOW}" "后端服务已在运行中"
            else
                start_backend
            fi
            ;;
        start-frontend)
            if ps aux | grep "[n]ode.*vite" > /dev/null; then
                print_message "${YELLOW}" "前端服务已在运行中"
            else
                start_frontend
            fi
            ;;
        stop)
            stop_services
            ;;
        stop-force)
            stop_services "force"
            ;;
        restart)
            print_message "${BLUE}" "重启所有服务..."
            stop_services
            start_backend
            start_frontend
            print_message "${GREEN}" "所有服务已重启"
            print_message "${BLUE}" "访问地址:"
            print_message "${GREEN}" "- 前端地址: http://localhost:5173"
            print_message "${GREEN}" "- 后端地址: http://localhost:5001"
            ;;
        status)
            check_status
            ;;
        logs)
            local log_type=$1
            local lines=$2
            
            if [ -z "$log_type" ]; then
                print_message "${RED}" "请指定日志类型: backend 或 frontend"
                exit 1
            fi
            
            view_logs "$log_type" "$lines"
            ;;
        test)
            local test_type="$1"
            shift
            
            if [ -f "${SCRIPT_DIR}/tests/run_tests.py" ]; then
                cd "${SCRIPT_DIR}"
                
                case "$test_type" in
                    openrouter)
                        print_message "${BLUE}" "运行 OpenRouter API 测试..."
                        python3 tests/run_tests.py --openrouter "$@"
                        ;;
                    stream)
                        print_message "${BLUE}" "运行 OpenRouter API 流式输出测试..."
                        python3 tests/run_tests.py --stream "$@"
                        ;;
                    backend)
                        print_message "${BLUE}" "运行后端测试..."
                        python3 tests/run_tests.py --backend "$@"
                        ;;
                    frontend)
                        print_message "${BLUE}" "运行前端测试..."
                        python3 tests/run_tests.py --frontend "$@"
                        ;;
                    update-logs)
                        print_message "${BLUE}" "更新日志链接..."
                        python3 tests/run_tests.py --update-logs "$@"
                        ;;
                    collect-tests)
                        print_message "${BLUE}" "收集项目中的测试文件..."
                        python3 tests/run_tests.py --collect-tests "$@"
                        ;;
                    *)
                        print_message "${BLUE}" "运行所有测试..."
                        python3 tests/run_tests.py "$@"
                        ;;
                esac
            else
                print_message "${RED}" "找不到测试脚本: ${SCRIPT_DIR}/tests/run_tests.py"
                exit 1
            fi
            ;;
        help|"")
            show_help
            ;;
        *)
            print_message "${RED}" "未知命令: ${command}"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
