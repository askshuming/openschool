#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [[ $# -lt 1 ]]; then
  echo "用法: ./run-minimax.sh <MINIMAX_API_KEY> [MINIMAX_API_URL]"
  echo "示例: ./run-minimax.sh 'your_key_here'"
  echo "示例: ./run-minimax.sh 'your_key_here' 'https://api.minimax.io/v1/text/chatcompletion_v2'"
  exit 1
fi

MINIMAX_API_KEY="$1"
MINIMAX_API_URL="${2:-}"

{
  echo "MINIMAX_API_KEY=${MINIMAX_API_KEY}"
  echo "MINIMAX_MODEL=MiniMax2.7"
  if [[ -n "$MINIMAX_API_URL" ]]; then
    echo "MINIMAX_API_URL=${MINIMAX_API_URL}"
  fi
} > .env.local

echo "已写入 .env.local"
echo "启动中: http://localhost:4310"
npm run dev
