#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${ROOT}/python/smart_json.py"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }
section() { echo -e "\n${BOLD}$1${NC}"; }

# Run the python formatter with the same defaults the VS Code extension uses
fmt() { echo "$1" | python3 "$PYTHON" --sort-keys --strip-comments; }

# Assert formatted output equals expected (ignoring leading/trailing whitespace)
assert_eq() {
  local description="$1"
  local input="$2"
  local expected="$3"
  local actual
  actual=$(fmt "$input" 2>&1) || true
  if [[ "$actual" == "$expected" ]]; then
    pass "$description"
  else
    fail "$description"
    echo -e "    ${YELLOW}expected:${NC} $expected"
    echo -e "    ${YELLOW}  actual:${NC} $actual"
  fi
}

# Assert output contains a substring
assert_contains() {
  local description="$1"
  local input="$2"
  local needle="$3"
  local actual
  actual=$(fmt "$input" 2>&1) || true
  if [[ "$actual" == *"$needle"* ]]; then
    pass "$description"
  else
    fail "$description"
    echo -e "    ${YELLOW}expected to contain:${NC} $needle"
    echo -e "    ${YELLOW}             actual:${NC} $actual"
  fi
}

# Assert formatter exits with non-zero for bad input
assert_fails() {
  local description="$1"
  local input="$2"
  if echo "$input" | python3 "$PYTHON" >/dev/null 2>&1; then
    fail "$description (expected failure but it succeeded)"
  else
    pass "$description"
  fi
}

# ============================================================
section "1. Environment"
# ============================================================

if command -v python3 &>/dev/null; then
  pass "python3 found ($(python3 --version))"
else
  fail "python3 not found — install Python 3 and add it to PATH"
fi

if command -v node &>/dev/null; then
  pass "node found ($(node --version))"
else
  fail "node not found"
fi

if command -v npm &>/dev/null; then
  pass "npm found ($(npm --version))"
else
  fail "npm not found"
fi

if [[ -f "${ROOT}/python/smart_json.py" ]]; then
  pass "python/smart_json.py exists"
else
  fail "python/smart_json.py is missing"
fi

if [[ -f "${ROOT}/package.json" ]]; then
  pass "package.json exists"
else
  fail "package.json is missing"
fi

if [[ -d "${ROOT}/node_modules" ]]; then
  pass "node_modules installed"
else
  fail "node_modules missing — run 'npm install'"
fi

# ============================================================
section "2. TypeScript — type check"
# ============================================================

if cd "$ROOT" && npm run check-types --silent 2>&1 | grep -q "error TS"; then
  fail "TypeScript type errors found"
elif cd "$ROOT" && npm run check-types --silent 2>/dev/null; then
  pass "No TypeScript errors"
else
  fail "TypeScript check failed unexpectedly"
fi

# ============================================================
section "3. Linting"
# ============================================================

if cd "$ROOT" && npm run lint --silent 2>/dev/null; then
  pass "ESLint passed"
else
  fail "ESLint reported errors"
fi

# ============================================================
section "4. Formatter — basic output"
# ============================================================

assert_eq \
  "Empty object" \
  '{}' \
  '{}'

assert_eq \
  "Empty array" \
  '[]' \
  '[]'

assert_eq \
  "Simple flat object stays on one line" \
  '{"b": 2, "a": 1}' \
  '{ "a": 1, "b": 2 }'

assert_eq \
  "Simple array stays on one line" \
  '[1, 2, 3]' \
  '[1, 2, 3]'

assert_eq \
  "Null value" \
  'null' \
  'null'

assert_eq \
  "Boolean values" \
  '{"b": false, "a": true}' \
  '{ "a": true, "b": false }'

assert_eq \
  "Nested compact object on one line" \
  '{"z": {"y": 2, "x": 1}}' \
  '{ "z": { "x": 1, "y": 2 } }'

# ============================================================
section "5. Formatter — alphabetical key sorting"
# ============================================================

assert_eq \
  "Top-level keys sorted" \
  '{"z": 1, "a": 2, "m": 3}' \
  '{ "a": 2, "m": 3, "z": 1 }'

assert_eq \
  "Nested keys sorted recursively" \
  '{"b": {"z": 9, "a": 1}, "a": {"y": 8, "b": 2}}' \
  '{ "a": { "b": 2, "y": 8 }, "b": { "a": 1, "z": 9 } }'

assert_eq \
  "Keys inside arrays sorted" \
  '[{"z": 1, "a": 2}]' \
  '[{ "a": 2, "z": 1 }]'

# ============================================================
section "6. Formatter — unicode and accents preserved"
# ============================================================

assert_contains \
  "Accented characters not escaped" \
  '{"nombre": "José", "ciudad": "Bogotá"}' \
  'José'

assert_contains \
  "Spanish punctuation preserved" \
  '{"saludo": "¡Hola!"}' \
  '¡Hola!'

assert_contains \
  "Unicode emoji preserved" \
  '{"icon": "🚀"}' \
  '🚀'

assert_contains \
  "Chinese characters preserved" \
  '{"name": "北京"}' \
  '北京'

assert_contains \
  "Accented key preserved" \
  '{"café": "latte"}' \
  'café'

# ============================================================
section "7. Formatter — JSONC (comments stripped)"
# ============================================================

assert_contains \
  "Single-line comment stripped" \
  '{ "a": 1 // comment
}' \
  '"a": 1'

assert_contains \
  "Block comment stripped" \
  '{ /* block */ "a": 1 }' \
  '"a": 1'

assert_contains \
  "URL inside string not broken" \
  '{"url": "http://example.com/path"}' \
  'http://example.com/path'

# ============================================================
section "8. Formatter — wide objects expand across lines"
# ============================================================

WIDE='{"aaaaaaaaaa": "value_one", "bbbbbbbbbb": "value_two", "cccccccccc": "value_three", "dddddddddd": "value_four"}'
WIDE_OUT=$(fmt "$WIDE" 2>/dev/null)
if echo "$WIDE_OUT" | grep -q $'\n'; then
  pass "Wide object expands to multiple lines"
else
  fail "Wide object should have expanded but stayed on one line"
fi

SIMPLE='{"a": 1}'
SIMPLE_OUT=$(fmt "$SIMPLE" 2>/dev/null)
LINE_COUNT=$(echo "$SIMPLE_OUT" | wc -l)
if [[ "$LINE_COUNT" -eq 1 ]]; then
  pass "Simple object stays on one line"
else
  fail "Simple object should be one line but got $LINE_COUNT lines"
fi

# ============================================================
section "9. Formatter — error handling"
# ============================================================

assert_fails "Invalid JSON fails gracefully" "{ not valid json }"
assert_fails "Truncated JSON fails gracefully" '{"a": 1'
assert_eq   "Empty input exits cleanly" "" ""

# ============================================================
# Summary
# ============================================================

TOTAL=$((PASS + FAIL))
echo ""
echo -e "${BOLD}Results: ${PASS}/${TOTAL} passed${NC}"

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}${FAIL} test(s) failed — fix these before building or releasing.${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed. Safe to build and release.${NC}"
fi
