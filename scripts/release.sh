#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh [patch|minor|major]
# Defaults to patch bump.

BUMP="${1:-patch}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Validate bump type ---
if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# --- Check required tools ---
for cmd in git gh node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is required but not found."
    exit 1
  fi
done

if ! command -v vsce &>/dev/null; then
  echo "==> Installing vsce..."
  npm install -g @vscode/vsce
fi

# --- Ensure clean working tree ---
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: Working tree is not clean. Commit or stash your changes first."
  exit 1
fi

# --- Bump version in package.json ---
CURRENT_VERSION=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
echo "==> Bumping version: ${CURRENT_VERSION} -> ${NEW_VERSION}"

# Update package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# --- Build ---
echo "==> Building..."
npm install
npm run package

# --- Package .vsix ---
VSIX="smart-json-formatter-${NEW_VERSION}.vsix"
echo "==> Packaging ${VSIX}..."
vsce package --out "$VSIX"

# --- Commit version bump ---
echo "==> Committing version bump..."
git add package.json package-lock.json
git commit -m "chore: release v${NEW_VERSION}"

# --- Tag ---
TAG="v${NEW_VERSION}"
echo "==> Tagging ${TAG}..."
git tag "$TAG"

# --- Push ---
echo "==> Pushing to origin..."
git push origin HEAD
git push origin "$TAG"

# --- GitHub Release ---
echo "==> Creating GitHub release ${TAG}..."
gh release create "$TAG" "$VSIX" \
  --title "v${NEW_VERSION}" \
  --generate-notes

echo ""
echo "Release v${NEW_VERSION} published successfully."
echo "VSIX: ${VSIX}"
