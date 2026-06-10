#!/usr/bin/env bash
# rebaseline-check.sh — PREUVE DE REPRODUCTIBILITÉ de la chaîne de migrations 0001→00NN.
# ============================================================================================
# Rejoue TOUTES les migrations sur une base NEUVE et JETABLE (non destructif pour la base de dev),
# dans un environnement Supabase fidèle (extensions dans le schéma `extensions`, schéma `auth`
# stubké : auth.uid/jwt + auth.users minimal), puis un smoke test (boucle d'or -> audit = 0).
# But : prouver que `supabase db reset` / un déploiement cloud neuf (projet G2) appliquera la chaîne
# sans erreur. Sort non-zéro si une migration échoue ou si l'audit n'est pas à 0.
#
# Usage :  bash scripts/rebaseline-check.sh
# Prérequis : conteneur Docker du Postgres local en marche (SUPABASE_DB_CONTAINER, défaut ci-dessous).
# NB : le seed.sql N'EST PAS rejoué ici (il dépend des tables GoTrue réelles auth.users/auth.identities,
#      absentes du stub) ; il s'applique sur un vrai environnement Supabase (db reset / cloud).
set -uo pipefail

CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_Co-Pro-Flex}"
DBNAME="rebaseline_check"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGDIR="$ROOT/supabase/migrations"

psql_db() { docker exec -i "$CONTAINER" psql -U postgres -d "$1" -v ON_ERROR_STOP=1 "${@:2}"; }

echo "rebaseline-check — conteneur $CONTAINER, base jetable $DBNAME"

# 1. Base jetable propre.
docker exec "$CONTAINER" psql -U postgres -d postgres -c "drop database if exists $DBNAME;" >/dev/null 2>&1
docker exec "$CONTAINER" psql -U postgres -d postgres -c "create database $DBNAME;" >/dev/null 2>&1

# 2. Environnement Supabase fidèle (extensions dans `extensions`, auth stubké, rôles).
psql_db "$DBNAME" >/dev/null 2>&1 <<'ENVSQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
alter database rebaseline_check set search_path to public, extensions;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),'')::jsonb, '{}'::jsonb) $$;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(), instance_id uuid, aud text, role text,
  email text, encrypted_password text, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now());
ENVSQL

# 3. Rejeu des migrations dans l'ordre, attribution d'erreur par fichier.
fail=0
for f in $(ls "$MIGDIR"/*.sql | sort); do
  out=$(cat "$f" | docker exec -i "$CONTAINER" psql -U postgres -d "$DBNAME" -v ON_ERROR_STOP=1 2>&1)
  if echo "$out" | grep -qiE "^ERROR|FATAL"; then
    fail=$((fail+1))
    echo "  ✗ $(basename "$f")"
    echo "$out" | grep -iE "ERROR|FATAL" | head -2 | sed 's/^/      /'
  fi
done

# 4. Smoke test : boucle d'or -> audit_finance_integrity = 0 (claim service_role session-level).
smoke=$(docker exec -i "$CONTAINER" psql -U postgres -d "$DBNAME" -v ON_ERROR_STOP=1 2>&1 <<'SMOKE'
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
do $$
declare v_copro uuid; v_audit int;
begin
  v_copro := create_clean_test_copro_seeded('rebase-smoke');
  select count(*) into v_audit from audit_finance_integrity(v_copro);
  if v_audit <> 0 then raise exception 'SMOKE FAIL: audit=% sur base rejouee', v_audit; end if;
  raise notice 'SMOKE OK: boucle d or seedee, audit_finance_integrity=0';
end $$;
SMOKE
)
echo "$smoke" | grep -qE "SMOKE OK" && smoke_ok=1 || smoke_ok=0
echo "$smoke" | grep -iE "SMOKE OK|SMOKE FAIL|ERROR" | head -3 | sed 's/^/  /'

# 5. Nettoyage.
docker exec "$CONTAINER" psql -U postgres -d postgres -c "drop database if exists $DBNAME;" >/dev/null 2>&1

n=$(ls "$MIGDIR"/*.sql | wc -l | tr -d ' ')
echo ""
if [ "$fail" -eq 0 ] && [ "$smoke_ok" -eq 1 ]; then
  echo "rebaseline-check — ✅ REPRODUCTIBLE : $n/$n migrations rejouées + smoke audit=0."
  exit 0
fi
echo "rebaseline-check — ❌ $fail migration(s) en échec / smoke_ok=$smoke_ok."
exit 1
