#!/usr/bin/env bash
# Carga un respaldo (ya descifrado y descomprimido) en una base Postgres de Supabase vacía.
# Uso: scripts/respaldo/restaurar.sh carpeta-del-respaldo "postgresql://postgres:CLAVE@HOST:5432/postgres"
# Es el procedimiento oficial de Supabase para pasar una copia a un proyecto nuevo.
set -euo pipefail
dir="$1"; db="$2"
psql --single-transaction --variable ON_ERROR_STOP=1 --quiet \
  --file "$dir/roles.sql" \
  --file "$dir/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$dir/data.sql" \
  --dbname "$db"
echo "Base restaurada."
