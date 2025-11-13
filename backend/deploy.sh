#!/bin/bash

# 生产环境部署脚本 for server.py (FastAPI应用)
# 使用 uv 和 uvicorn

set -e  # 遇到错误退出

echo "开始部署 server.py..."

# 导航到脚本目录（假设脚本在backend目录下）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo "错误: uv 未安装。请先安装 uv (https://github.com/astral-sh/uv)"
    exit 1
fi

# 同步依赖
echo "安装/更新依赖..."
uv sync

# 设置环境变量（根据需要调整）
export DB_PATH="${DB_PATH:-./data.db}"
export TOKEN_FILE="${TOKEN_FILE:-./tokens.txt}"
export TOKEN_REFRESH_SEC="${TOKEN_REFRESH_SEC:-60}"
export CLOUDSYNC_SECRET="${CLOUDSYNC_SECRET:-}"  # 如果需要

# 运行服务器（生产模式，使用多个workers）
echo "启动服务器..."
uv run uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info

echo "服务器已启动，访问 http://your-server-ip:8000"