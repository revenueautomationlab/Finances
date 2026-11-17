#!/usr/bin/env bash
# Nightly RAL Finance backup (letterlock deploy/backup.sh pattern). Cron: 45 3 * * * on the VPS.
# pg_dump -Fc of "finance" + the .env, full restore check into a scratch DB, keep 14 days.
set -euo pipefail
DEST=/opt/ral-finance/backups
STAMP=$(date +%F)
DB="docker exec -i ral-finance-db"
mkdir -p "$DEST"
$DB pg_dump -U postgres -Fc finance > "$DEST/finance-$STAMP.dump"
tar czf "$DEST/env-$STAMP.tgz" -C / opt/ral-finance/.env 2>/dev/null || true
chmod 600 "$DEST/finance-$STAMP.dump" "$DEST/env-$STAMP.tgz" 2>/dev/null || true

$DB psql -qU postgres -d postgres -c "drop database if exists finance_restorecheck" >/dev/null 2>&1
$DB createdb -U postgres finance_restorecheck
if $DB pg_restore -U postgres -d finance_restorecheck --no-owner < "$DEST/finance-$STAMP.dump" >/dev/null 2>&1; then
  TABLES=$($DB psql -U postgres -d finance_restorecheck -qtAc \
    "select count(*) from information_schema.tables where table_schema='public'")
  LIVE=$($DB psql -U postgres -d finance -qtAc "select count(*) from public.projects")
  REST=$($DB psql -U postgres -d finance_restorecheck -qtAc "select count(*) from public.projects")
  if [ "${TABLES:-0}" -ge 20 ] && [ "$LIVE" = "$REST" ]; then
    echo "$STAMP restore check ok ($TABLES tables, projects $REST)"
  else
    echo "$STAMP RESTORE CHECK FAILED: tables=$TABLES projects live=$LIVE restored=$REST"
  fi
else
  echo "$STAMP RESTORE CHECK FAILED: pg_restore could not read $DEST/finance-$STAMP.dump"
fi
$DB psql -qU postgres -d postgres -c "drop database finance_restorecheck" >/dev/null

find "$DEST" -name '*.dump' -mtime +14 -delete
find "$DEST" -name 'env-*.tgz' -mtime +14 -delete
