#!/usr/bin/env sh
# End-to-end tests: builds and starts the e2e stack, loads the demo accounts, runs Playwright in its
# official image inside the stack's network, and removes the stack again.
#   frontend/e2e/run.sh                  all tests
#   frontend/e2e/run.sh e2e/auth.spec.ts one file (any Playwright arguments)
# Set KEEP_STACK=1 to leave the stack running (the app is then at http://localhost:${E2E_PORT:-8088}).
set -eu

cd "$(dirname "$0")/.."
FRONTEND_DIR=$(pwd)
COMPOSE="docker compose -f e2e/docker-compose.e2e.yml"
PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.54.2-noble

# Generated per run so no credential is committed; the stack is thrown away afterwards.
random_secret() { head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }
E2E_DB_PASSWORD=$(random_secret 24)
E2E_JWT_KEY=$(random_secret 48)
export E2E_DB_PASSWORD E2E_JWT_KEY

cleanup() {
  if [ "${KEEP_STACK:-}" != "1" ]; then
    $COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

$COMPOSE up -d --build

# The API answers once migrations are applied; an anonymous request to a protected route gets 401.
api_ready() {
  $COMPOSE exec -T frontend wget -qS -O /dev/null http://api:5000/api/auth/me 2>&1 | grep -q ' 401'
}
echo "Waiting for the API..."
for _ in $(seq 1 90); do
  api_ready && break
  sleep 2
done
api_ready || { echo "The API did not start:"; $COMPOSE logs api | tail -50; exit 1; }

# Demo teacher and admin (password Demo1234!); there is no self-service way to get a staff role.
$COMPOSE exec -T postgresql psql -q -v ON_ERROR_STOP=1 -U medapp -d medapp < ../infra/scripts/Diploma_DB_seed.sql

NETWORK=$(docker network ls --filter label=com.docker.compose.project=medapp-e2e --format '{{.Name}}' | head -n 1)

docker run --rm --ipc=host --network "$NETWORK" \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI="${CI:-}" \
  -e E2E_BASE_URL=http://frontend \
  -v "$FRONTEND_DIR":/app -w /app \
  "$PLAYWRIGHT_IMAGE" npx playwright test "$@"
