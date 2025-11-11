#!/bin/sh
set -e

echo "🚀 Starting QA Evidence Center..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
MAX_RETRIES=30
RETRY_COUNT=0

# Use node_modules/.bin/prisma if available, otherwise use npx
PRISMA_CMD="node_modules/.bin/prisma"
if [ ! -f "$PRISMA_CMD" ]; then
  PRISMA_CMD="npx prisma"
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if $PRISMA_CMD db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database is ready!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Database is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Database connection failed after $MAX_RETRIES attempts"
  exit 1
fi

# Run migrations
echo "📦 Running database migrations..."
$PRISMA_CMD migrate deploy || echo "⚠️  Migration failed or already applied"

# Optionally seed database (only if empty)
echo "🌱 Checking if database needs seeding..."
USER_COUNT=$($PRISMA_CMD db execute --stdin <<< "SELECT COUNT(*) as count FROM User" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "1")

if [ "$USER_COUNT" = "0" ]; then
  echo "📝 Seeding database..."
  if [ -f "package.json" ]; then
    npm run db:seed || echo "⚠️  Seeding failed or already seeded"
  else
    echo "⚠️  package.json not found, skipping seed"
  fi
else
  echo "✅ Database already has data, skipping seed"
fi

# Start Next.js
echo "🎉 Starting Next.js server..."
exec node server.js
