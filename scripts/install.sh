#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Find the .vsix to install ---
# Prefer a version passed as argument, otherwise pick the latest one in the root
if [[ $# -ge 1 ]]; then
  VSIX="$1"
else
  VSIX=$(ls -t "${ROOT}"/smart-json-formatter-*.vsix 2>/dev/null | head -n1 || true)
fi

if [[ -z "$VSIX" || ! -f "$VSIX" ]]; then
  echo "No .vsix found. Run './scripts/build.sh' first, or pass the path as an argument."
  echo "Usage: $0 [path/to/smart-json-formatter-x.x.x.vsix]"
  exit 1
fi

# --- Find VS Code CLI ---
for cmd in code code-insiders codium; do
  if command -v "$cmd" &>/dev/null; then
    VSCODE_CMD="$cmd"
    break
  fi
done

if [[ -z "${VSCODE_CMD:-}" ]]; then
  echo "Error: VS Code CLI ('code') not found in PATH."
  echo "Open VS Code -> Command Palette -> 'Shell Command: Install code command in PATH', then retry."
  exit 1
fi

echo "==> Installing $(basename "$VSIX") into VS Code..."
"$VSCODE_CMD" --install-extension "$VSIX"

echo ""
echo "Done. Reload VS Code (Ctrl+Shift+P -> 'Reload Window') to activate the extension."
