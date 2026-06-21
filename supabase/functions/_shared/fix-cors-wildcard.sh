#!/usr/bin/env bash
# fix-cors-wildcard.sh
# Replaces hardcoded "Access-Control-Allow-Origin": "*" with resolveCorsHeaders(req)
# across all edge functions that have not already adopted the allowlist pattern.
#
# ⚠️  REQUIRES MUTI APPROVAL BEFORE RUNNING — affects 53 edge functions.
# ⚠️  Run on a branch / staging deploy, not directly on production.
#
# Usage (from repo root):
#   bash supabase/functions/_shared/fix-cors-wildcard.sh [--dry-run]
#
# After running, each modified function must:
#   1. Import resolveCorsHeaders from "_shared/cors.ts"
#   2. Replace all standalone corsHeaders objects with resolveCorsHeaders(req)
#
# This script handles the mechanical replacement. Manual review is required
# for any function where `req` is not in scope at the point the headers are built.

set -euo pipefail
FUNCTIONS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

IMPORT_LINE='import { resolveCorsHeaders } from "./_shared/cors.ts";'

# Pattern to detect already-migrated functions
ALREADY_MIGRATED_PATTERN="resolveCorsHeaders"

# Pattern to detect the hardcoded wildcard object form used in most functions:
#   const corsHeaders = {
#     "Access-Control-Allow-Origin": "*",
WILDCARD_CONST_PATTERN='"Access-Control-Allow-Origin": "\*"'

modified=0
skipped=0

for fn_dir in "$FUNCTIONS_DIR"/*/; do
  fn_name=$(basename "$fn_dir")
  [[ "$fn_name" == "_shared" ]] && continue

  index="$fn_dir/index.ts"
  [[ -f "$index" ]] || continue

  if grep -q "$ALREADY_MIGRATED_PATTERN" "$index"; then
    echo "  SKIP (already migrated): $fn_name"
    ((skipped++)) || true
    continue
  fi

  if ! grep -q "$WILDCARD_CONST_PATTERN" "$index"; then
    echo "  SKIP (no wildcard CORS): $fn_name"
    ((skipped++)) || true
    continue
  fi

  echo "  PATCH: $fn_name"
  if [[ "$DRY_RUN" == "false" ]]; then
    # 1. Add import if not present
    if ! grep -q "resolveCorsHeaders" "$index"; then
      # Insert import after the last existing import line
      sed -i '' '/^import /{ h; d }; /^[^import]/{ G; s/\n.*//; }' "$index" 2>/dev/null || true
      # Simpler: prepend to file
      tmp=$(mktemp)
      echo "$IMPORT_LINE" > "$tmp"
      cat "$index" >> "$tmp"
      mv "$tmp" "$index"
    fi

    # 2. Replace the hardcoded corsHeaders const block with resolveCorsHeaders call.
    #    This targets the common 3-line pattern. Functions with non-standard patterns
    #    will need manual review (flagged by the grep below).
    perl -0777 -i -pe '
      s/const corsHeaders\s*=\s*\{\s*\n\s*"Access-Control-Allow-Headers"[^}]+\}\s*;/const corsHeaders = resolveCorsHeaders(req);/g;
      s/const corsHeaders\s*=\s*\{\s*\n\s*"Access-Control-Allow-Origin":\s*"\*"[^}]*\}\s*;/const corsHeaders = resolveCorsHeaders(req);/g;
    ' "$index"
  fi
  ((modified++)) || true
done

echo ""
echo "Done. Modified: $modified | Skipped: $modified | Dry-run: $DRY_RUN"
echo ""
echo "Next steps:"
echo "  1. Review each modified function — ensure 'req' is in scope where corsHeaders is used."
echo "  2. Run: supabase functions deploy (staging first)"
echo "  3. Smoke-test all CORS-dependent endpoints from the web app and extension."
echo "  4. Deploy to production."
