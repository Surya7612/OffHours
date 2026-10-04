#!/usr/bin/env bash
# Applies the migrations to a throwaway local Postgres with a minimal Supabase auth stub,
# then runs the policy checks. Usage: supabase/tests/run.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
data="$(mktemp -d)"
port=55432
trap 'pg_ctl -D "$data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$data"' EXIT

initdb -D "$data" -U postgres --auth=trust >/dev/null
pg_ctl -D "$data" -o "-p $port -k $data" -l "$data/log" start >/dev/null
sleep 1

psql_cmd=(psql -h "$data" -p "$port" -U postgres -v ON_ERROR_STOP=1 -q)
"${psql_cmd[@]}" -c "create database offhours"

"${psql_cmd[@]}" -d offhours <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
SQL

for migration in "$root"/migrations/*.sql; do
  "${psql_cmd[@]}" -d offhours -f "$migration"
done

"${psql_cmd[@]}" -d offhours -f "$here/policies.sql"
"${psql_cmd[@]}" -d offhours -f "$here/alerts.sql"
"${psql_cmd[@]}" -d offhours -f "$here/moderation.sql"
"${psql_cmd[@]}" -d offhours -f "$here/gathering_details.sql"
