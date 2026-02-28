#!/bin/bash
# sync-staging-db.sh — Reset staging database to match production schema
#
# Usage:
#   1. Set STAGING_DB_URL in your environment (get it from Supabase dashboard → Settings → Database → Connection string → URI)
#   2. Run: bash scripts/sync-staging-db.sh
#
# What it does:
#   - Dumps the latest schema from production (via Supabase CLI linked project)
#   - Pushes that schema to your staging Supabase project
#   - Does NOT copy production data — only table structures, policies, functions

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DUMP_FILE="$PROJECT_DIR/supabase/schema-dump.sql"

echo "=== Step 1: Dump production schema ==="
cd "$PROJECT_DIR"
npx supabase db dump --linked > "$DUMP_FILE"
echo "Schema dumped to $DUMP_FILE ($(wc -l < "$DUMP_FILE") lines)"

echo ""
echo "=== Step 2: Push to staging ==="
if [ -z "$STAGING_DB_URL" ]; then
  echo "ERROR: STAGING_DB_URL is not set."
  echo ""
  echo "Get it from your staging Supabase project:"
  echo "  Dashboard → Settings → Database → Connection string → URI"
  echo "  It looks like: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
  echo ""
  echo "Then run:"
  echo "  STAGING_DB_URL='your-connection-string' bash scripts/sync-staging-db.sh"
  exit 1
fi

echo "Pushing schema to staging database..."
npx supabase db push --db-url "$STAGING_DB_URL"

echo ""
echo "=== Done ==="
echo "Staging database schema is now in sync with production."
echo "Note: No data was copied. Add test data manually or via the Supabase dashboard."
