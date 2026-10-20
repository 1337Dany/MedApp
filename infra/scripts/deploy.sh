#!/usr/bin/env sh
# Production deploy of the checkout this script lives in (run by .github/workflows/deploy.yml, or by hand):
#   1. dumps the database (if the stack is running) to backups/, keeping the last $KEEP_BACKUPS dumps;
#   2. rebuilds and restarts the stack with the production profile, applying pending migrations;
#   3. waits until the API answers through nginx, otherwise prints the logs and fails.
# Needs a .env next to docker-compose.yml (see .env.example) with FRONTEND_PORT set to the public port.
set -eu

cd "$(dirname "$0")/../.."
PROJECT=${COMPOSE_PROJECT_NAME:-medapp-prod}
KEEP_BACKUPS=${KEEP_BACKUPS:-14}
COMPOSE="docker compose -p $PROJECT -f docker-compose.yml -f docker-compose.prod.yml"

if [ ! -f .env ]; then
  echo "No .env in $(pwd); copy .env.example and fill in the secrets first." >&2
  exit 1
fi
# shellcheck disable=SC1091
. ./.env
PORT=${FRONTEND_PORT:-80}

echo "Deploying $(git rev-parse --short HEAD 2>/dev/null || echo 'working tree') as project $PROJECT"

# 1. Backup
if [ -n "$($COMPOSE ps -q postgresql 2>/dev/null)" ]; then
  mkdir -p backups
  dump="backups/$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  $COMPOSE exec -T postgresql pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" | gzip > "$dump"
  echo "Database dumped to $dump"
  ls -1t backups/*.sql.gz | tail -n +"$((KEEP_BACKUPS + 1))" | xargs -r rm --
else
  echo "Database is not running yet; skipping the backup (first deploy)."
fi

# 2. Build and restart. Every deploy is preceded by a dump, so migrations may run on start.
DB_MIGRATE_ON_STARTUP=true $COMPOSE up -d --build --remove-orphans

# 3. Health check: an anonymous request to a protected route gets 401 once the API is up behind nginx.
echo "Waiting for http://localhost:$PORT ..."
i=0
until [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/auth/me")" = "401" ]; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "The app did not come up:" >&2
    $COMPOSE ps >&2
    $COMPOSE logs --tail 80 api >&2
    exit 1
  fi
  sleep 3
done

docker image prune -f >/dev/null
echo "Deployed: http://localhost:$PORT"
