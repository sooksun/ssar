# ============================================
# SSAR / QA Evidence Center — Docker (Ubuntu host)
# Node.js 20 LTS · Next.js 15 · Prisma (MySQL/MariaDB)
# ============================================

FROM node:20-bookworm-slim AS base

# ติดตั้ง dependencies สำหรับ Prisma (openssl) และ sharp
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

ENV NODE_ENV=development
RUN npm ci

# Generate Prisma Client (ใช้ DATABASE_URL dummy ตอน build)
ENV DATABASE_URL="mysql://user:pass@localhost:3306/db?schema=public"
RUN npx prisma generate

COPY . .
ENV NODE_ENV=production
RUN npm run build

# --------------------------------------------
# Production stage (standalone)
# --------------------------------------------
FROM node:20-bookworm-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone: server.js + .next/static; ต้องมี public สำหรับ static และ uploads
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# prisma schema + migrations สำหรับรัน migrate deploy ตอน container start
COPY --from=base /app/prisma ./prisma

# ต้อง copy node_modules ทั้งก้อนจาก base stage (ไม่ใช่แค่ 3 โฟลเดอร์ prisma/@prisma/.bin) เพราะ
# `prisma` CLI ไม่ใช่ single-file binary — .bin/prisma เป็น symlink ที่ Docker COPY จะ dereference
# กลายเป็นไฟล์ 2.8MB ที่หลุดจาก sibling `prisma_schema_build_bg.wasm` (อยู่ใต้ node_modules/prisma/build/)
# ทำให้ crash ด้วย ENOENT ...wasm ตอน container start และต่อให้เรียก node_modules/prisma/build/index.js
# ตรง ๆ ก็ยัง crash ด้วย "Cannot find module 'effect'" เพราะ CLI มี dependency closure ทั้งก้อน
# (effect, @prisma/config, ฯลฯ) ที่การ copy แค่ 3 โฟลเดอร์ไม่ครอบคลุม การ copy node_modules เต็ม ๆ
# จาก base stage (ต้องอยู่ "หลัง" COPY standalone/static/public ด้านบน เพื่อให้ node_modules ก้อนเต็ม
# นี้ทับ node_modules แบบ pruned ที่ Next standalone วางไว้) แก้ปัญหานี้ตรง ๆ โดยแลกกับขนาด image ที่ใหญ่ขึ้น
COPY --from=base /app/node_modules ./node_modules

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p public/uploads/evidence public/uploads/lesson-plans public/uploads/teaching-media public/uploads/external-evaluations public/uploads/projects public/uploads/pa-teacher-docs public/uploads/teacher-sar public/uploads/community-teaching

EXPOSE 9954

ENV PORT=9954
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
