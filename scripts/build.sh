#!/bin/bash

# Comfortable Video - Build Script

set -e

echo "=== Comfortable Video - Build ==="
echo ""

echo "🔨 Building TypeScript project..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""
echo "📋 Copying static public assets into dist/"
mkdir -p dist
rsync -a --delete public/ dist/ || cp -r public/. dist/ || true

echo "🎉 Build process finished!"
