#!/usr/bin/env bash
# Applies the additive SQL files in prisma/manual-migrations/ (new tables only), in name order.
# Each file creates tables that don't exist yet; re-running a file that already ran fails harmlessly with "table exists".
set -euo pipefail
cd "$(dirname "$0")/.."
for f in prisma/manual-migrations/*.sql; do
  echo "→ applying $f"
  npx prisma db execute --file "$f" --schema prisma/schema.prisma
done
echo "done"
