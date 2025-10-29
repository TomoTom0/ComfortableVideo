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

# Ensure public assets are included in dist before packaging
echo "📋 Copying static public assets into dist/ for packaging"
mkdir -p dist
rsync -a --delete public/ dist/ || cp -r public/. dist/ || true
