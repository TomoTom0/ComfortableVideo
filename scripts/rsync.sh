#!/bin/bash

# Comfort Movie - Rsync Script

set -e

# .envファイルから設定を読み込み
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

echo "=== Comfort Movie - Rsync Deploy ==="
echo ""

# デプロイ先の確認
if [ -z "$DEPLOY_DESTINATION" ]; then
    echo "❌ Error: DEPLOY_DESTINATION not set in .env file"
    exit 1
fi

# distディレクトリの存在確認
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Please run build first."
    exit 1
fi

echo "📦 Deploying to: $DEPLOY_DESTINATION"

# rsync実行
rsync -av --delete dist/ "$DEPLOY_DESTINATION"

if [ $? -ne 0 ]; then
    echo "❌ Deploy failed"
    exit 1
fi

echo "✅ Deploy completed successfully"
echo ""
echo "🎉 Rsync process finished!"
echo "Extension files are now available at: $DEPLOY_DESTINATION"