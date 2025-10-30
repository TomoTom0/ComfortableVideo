#!/bin/bash

# Comfortable Video - Package Script

set -e

echo "=== Comfortable Video - Package ==="
echo ""

# distディレクトリの存在確認
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Please run build first."
    exit 1
fi

# ZIP作成
echo "📦 Creating extension package..."
mkdir -p build

cd dist && zip -r ../build/comfort-movie-extension.zip . -x "*.DS_Store" "*.tmp" "*:Zone.Identifier"

if [ $? -ne 0 ]; then
    echo "❌ ZIP creation failed"
    exit 1
fi

cd ..
echo "✅ Extension package created: build/comfort-movie-extension.zip"
echo ""
echo "🎉 Package process finished!"

## Note: public/ is copied into dist/ during build. No-op here to avoid duplication.
echo "Note: public/ assets are copied into dist/ during build. Skipping redundant copy."
