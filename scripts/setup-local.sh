#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE=".env.local"

cat << 'EOF' > "$ENV_FILE"
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

if ! command -v docker &> /dev/null || ! docker info &> /dev/null; then
  echo "Docker is not running or not installed."
  echo "Please start Docker Desktop or ensure the Docker daemon is running, then re-run this script."
  exit 1
fi

npx supabase start
npx supabase db reset --local --yes

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
