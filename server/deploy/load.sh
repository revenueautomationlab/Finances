#!/usr/bin/env bash
# Fresh (re)load of the finance DB from /opt/ral-finance/incoming/{schema,data}.sql (built by
# server/db/build_sql.py). DESTRUCTIVE for the VPS copy only: drops and recreates database "finance".
# Supabase is never touched. Prints row counts per public table at the end.
set -euo pipefail
cd /opt/ral-finance
set -a; . ./.env; set +a
PSQL="docker exec -i ral-finance-db psql -v ON_ERROR_STOP=1 -q -U postgres"
docker compose stop api >/dev/null 2>&1 || true
$PSQL -d postgres -c "drop database if exists finance with (force)" -c "create database finance"
$PSQL -d finance < incoming/schema.sql
$PSQL -d finance < incoming/data.sql
$PSQL -d finance <<SQL
alter database finance set search_path = public, extensions;
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = 'finance_app') then
    create role finance_app login;
  end if;
end \$\$;
alter role finance_app password '${APP_DB_PASSWORD}';
grant connect on database finance to finance_app;
grant usage on schema public, extensions to finance_app;
grant select, insert, update, delete on all tables in schema public to finance_app;
grant usage, select on all sequences in schema public to finance_app;
grant execute on all functions in schema public to finance_app;
alter default privileges in schema public grant select, insert, update, delete on tables to finance_app;
alter default privileges in schema public grant usage, select on sequences to finance_app;
SQL
$PSQL -d finance -tA -F $'\t' <<'SQL'
select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int
from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1;
SQL
docker compose up -d api >/dev/null 2>&1 || true
