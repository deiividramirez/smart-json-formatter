#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies..."
npm install

echo "==> Compiling extension..."
npm run package

echo "==> Packaging .vsix..."
if ! command -v vsce &>/dev/null; then
  echo "    vsce not found, installing globally..."
  npm install -g @vscode/vsce
fi

VERSION=$(node -p "require('./package.json').version")
vsce package --out "smart-json-formatter-${VERSION}.vsix"

echo ""
echo "Build complete: smart-json-formatter-${VERSION}.vsix"
