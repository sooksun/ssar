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

# prisma schema + migrations + CLI สำหรับรัน migrate deploy ตอน container start
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=base /app/node_modules/prisma ./node_modules/prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p public/uploads/evidence public/uploads/lesson-plans public/uploads/teaching-media public/uploads/external-evaluations public/uploads/projects public/uploads/pa-teacher-docs public/uploads/teacher-sar public/uploads/community-teaching

EXPOSE 9954

ENV PORT=9954
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
