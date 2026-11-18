#!/bin/bash
# Pomocnik lokalny: ./tools/sb.sh sql <plik.sql> | q "<zapytanie>"  (czyta .secrets)
set -e; cd "$(dirname "$0")/.."; set -a; . ./.secrets; set +a
api="https://api.supabase.com/v1/projects/$SUPABASE_REF"
case "$1" in
  sql) jq -Rs '{query: .}' "$2" | curl -s -X POST "$api/database/query" -H "Authorization: Bearer $SUPABASE_PAT" -H 'Content-Type: application/json' -d @- ;;
  q) jq -n --arg q "$2" '{query:$q}' | curl -s -X POST "$api/database/query" -H "Authorization: Bearer $SUPABASE_PAT" -H 'Content-Type: application/json' -d @- ;;
esac; echo
