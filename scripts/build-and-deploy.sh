#!/bin/bash

# Comfortable Video - Build and Deploy Script

set -e

# .envファイルから設定を読み込み
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

echo "=== Comfortable Video - Build and Deploy ==="
echo ""

# ビルド実行
echo "🔨 Building TypeScript project..."
bun run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

echo "📦 Deploying to: $DEPLOY_DESTINATION"

# Call the deploy-only script
echo "📦 Calling deploy script"
./scripts/deploy.sh

if [ $? -ne 0 ]; then
    echo "❌ Deploy failed"
    exit 1
fi

echo "✅ Deploy completed successfully"

echo ""

echo "🎉 Build and deploy process finished!"

echo "Extension files are now available at: $DEPLOY_DESTINATION"
