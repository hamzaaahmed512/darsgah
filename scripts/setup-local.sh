#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE=".env.local"

if ! command -v docker &> /dev/null || ! docker info &> /dev/null; then
  echo "Docker is not running or not installed."
  echo "Please start Docker Desktop or ensure the Docker daemon is running, then re-run this script."
  exit 1
fi

npx supabase start
npx supabase db reset --local --yes

status="$(npx supabase status -o env)"
api_url="$(printf '%s\n' "$status" | sed -n 's/^API_URL=//p' | tr -d '"')"
anon_key="$(printf '%s\n' "$status" | sed -n 's/^ANON_KEY=//p' | tr -d '"')"
service_role_key="$(printf '%s\n' "$status" | sed -n 's/^SERVICE_ROLE_KEY=//p' | tr -d '"')"
if [ -z "$api_url" ] || [ -z "$anon_key" ] || [ -z "$service_role_key" ]; then
  echo "Local Supabase status is missing required credentials." >&2
  exit 1
fi
session_secret="$(openssl rand -hex 32)"
printf 'NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\nNEXT_PUBLIC_APP_URL=http://localhost:3000\nPARENT_PORTAL_SESSION_SECRET=%s\n' \
  "$api_url" "$anon_key" "$service_role_key" "$session_secret" > "$ENV_FILE"

echo ""
echo "Local Supabase is ready."
echo "DBeaver connection:"
echo "  Host: 127.0.0.1"
echo "  Port: 54322"
echo "  Database: postgres"
echo "  Username: postgres"
echo "  Password: postgres"
echo "  SSL: Disable"
echo ""
echo "Start the website with:"
echo "  npm run dev:sh"
