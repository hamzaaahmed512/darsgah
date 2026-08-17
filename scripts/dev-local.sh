#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  ./scripts/setup-local.sh
fi

npx supabase start
npm run dev
