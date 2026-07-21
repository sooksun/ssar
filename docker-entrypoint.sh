#!/bin/sh
set -e

# รัน migration ก่อน serve — ถ้า migrate ล้มเหลว container ต้องหยุด ไม่ใช่ serve ด้วย schema ผิด
echo "[entrypoint] running prisma migrate deploy..."
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] starting Next.js server..."
exec node server.js
