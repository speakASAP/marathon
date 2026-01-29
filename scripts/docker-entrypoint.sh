#!/bin/sh
# Run Prisma migrations then start the app.
# Used by Dockerfile so schema is applied before NestJS connects.

set -e
cd /app

if [ -n "$DATABASE_URL" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
  echo "Prisma migrations complete."
else
  echo "DATABASE_URL not set, skipping Prisma migrations."
fi

exec node dist/main.js
