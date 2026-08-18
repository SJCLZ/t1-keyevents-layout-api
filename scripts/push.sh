#!/bin/bash
# push.sh — 一键 commit + push + 看 Vercel 部署状态
# 用法:./scripts/push.sh "fix: 修字号按钮"
#    或:./scripts/push.sh  (默认消息 "update: <timestamp>")

set -e
cd "$(dirname "$0")/.."

MSG="${1:-update: $(date +%Y-%m-%d_%H:%M)}"

echo "=== git status ==="
git status --short

echo ""
echo "=== git add + commit ==="
git add -A
git diff --cached --stat

if git diff --cached --quiet; then
  echo "⚠️ 没有变更,跳过 commit"
  exit 0
fi

git commit -m "$MSG"
echo "✅ Committed: $MSG"

echo ""
echo "=== git push ==="
git push origin main

echo ""
echo "=== Vercel auto-deploy 触发 ==="
echo "等 1-2 分钟,刷 Vercel URL 看新版本"
echo "  https://layout-api-five.vercel.app/editor"
echo ""
echo "看部署状态:vercel ls"
