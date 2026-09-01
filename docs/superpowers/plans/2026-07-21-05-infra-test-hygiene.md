# Infra & Test Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ migration เดินทางไปกับ repo และ Docker รัน migrate เองได้ พร้อมทำให้สัญญาณจาก test suite เชื่อถือได้

**Architecture:** ปัญหาสองข้อนี้ไม่แตะโค้ด runtime เลย — เป็นเรื่อง VCS/config ล้วน ๆ แต่ต้องทำก่อนแผนอื่นทั้งหมด เพราะแผน 03 จะสร้าง Prisma migration ใหม่ (ต้อง commit ได้) และทุกแผนใช้ `vitest` เป็นเกณฑ์ผ่าน (ต้องนับไม่ซ้ำ)

**Tech Stack:** git, Prisma 6.19 CLI, Docker (node:20-bookworm-slim), Vitest 2.1

## Global Constraints

- ห้ามแก้ไฟล์ใต้ `.claude/worktrees/**` — เป็นสำเนา repo ของ session อื่น
- Prisma CLI ที่ใช้ต้องตรึงเวอร์ชัน `6.19.0` ให้ตรงกับ `@prisma/client` ใน [package.json](../../../package.json)
- Migration ที่มีอยู่แล้ว 18 ชุดใน `prisma/migrations/` ห้ามแก้ไขเนื้อหา — commit ตามที่เป็น
- ข้อความ commit ใช้ Conventional Commits (`fix:`, `chore:`, `feat:`) ตามที่ repo ใช้อยู่

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `.gitignore` (modify) | เลิก ignore `prisma/migrations`, เริ่ม ignore `.claude/` |
| `prisma/migrations/**` (track) | 18 migration ที่มีอยู่ เข้าสู่ VCS |
| `docker-entrypoint.sh` (create) | รัน `prisma migrate deploy` แล้วค่อย exec `node server.js` |
| `Dockerfile` (modify) | ติดตั้ง prisma CLI + schema + migrations ใน runner stage, เรียก entrypoint |
| `vitest.config.ts` (modify) | exclude `.claude` ออกจาก test discovery |

---

### Task 1: ทำให้ migration เข้า VCS และ Docker รัน migrate เองได้

**Files:**
- Modify: `.gitignore:39`
- Create: `docker-entrypoint.sh`
- Modify: `Dockerfile:33-58` (runner stage)

**Interfaces:**
- Consumes: ไม่มี (task แรกของแผน)
- Produces: `prisma/migrations/**` อยู่ใน git — แผน 03 จะสร้าง migration เพิ่มบนฐานนี้; container รัน `prisma migrate deploy` อัตโนมัติทุกครั้งที่ start

- [ ] **Step 1: ยืนยันปัญหาก่อนแก้ — migration ไม่อยู่ใน git**

```bash
git ls-files prisma/migrations | wc -l
git check-ignore -v prisma/migrations/20251106140555_init/migration.sql
```

Expected:
```
0
.gitignore:39:/prisma/migrations	prisma/migrations/20251106140555_init/migration.sql
```

ถ้าได้ตัวเลขมากกว่า 0 แปลว่ามีคนแก้ไปแล้ว — ข้ามไป Step 4

- [ ] **Step 2: แก้ .gitignore**

เปิด `.gitignore` ลบ 2 บรรทัดนี้ออก (บรรทัด 38-39):

```
# prisma
/prisma/migrations
```

แล้วเพิ่มบล็อกนี้ต่อท้ายไฟล์:

```
# Claude Code worktrees (สำเนา repo ของ session — ห้าม commit)
.claude/worktrees/
.claude/settings.local.json
```

- [ ] **Step 3: ยืนยันว่า migration ไม่ถูก ignore แล้ว และ worktrees ถูก ignore**

```bash
git check-ignore -v prisma/migrations/20251106140555_init/migration.sql; echo "migrations_ignored=$?"
git check-ignore -v .claude/worktrees/tender-albattani; echo "worktrees_ignored=$?"
git status --short prisma/migrations | head -5
```

Expected: `migrations_ignored=1` (ไม่ถูก ignore แล้ว), `worktrees_ignored=0` (ถูก ignore แล้ว), และ `git status` ขึ้น `?? prisma/migrations/`

- [ ] **Step 4: commit migration ทั้งหมดเข้า VCS**

```bash
git add .gitignore prisma/migrations
git commit -m "fix: track prisma migrations in VCS + ignore claude worktrees

migration 18 ชุดถูก gitignore ไว้ ทำให้ clone ใหม่ไม่มี migration
ให้รัน prisma migrate deploy ตอน deploy ไม่ได้เลย"
git ls-files prisma/migrations | wc -l
```

Expected: ตัวเลขมากกว่า 18 (นับทั้ง `migration.sql` และ `migration_lock.toml`)

- [ ] **Step 5: สร้าง docker-entrypoint.sh**

```bash
#!/bin/sh
set -e

# รัน migration ก่อน serve — ถ้า migrate ล้มเหลว container ต้องหยุด ไม่ใช่ serve ด้วย schema ผิด
echo "[entrypoint] running prisma migrate deploy..."
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] starting Next.js server..."
exec node server.js
```

- [ ] **Step 6: แก้ Dockerfile runner stage ให้มี prisma CLI + schema + migrations**

ใน `Dockerfile` แทนที่บล็อก runner stage เดิม (ตั้งแต่ `# Next.js standalone: ...` จนจบไฟล์) ด้วย:

```dockerfile
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
```

**หมายเหตุ:** `base` stage ตั้ง `NODE_ENV=development` ตอน `npm ci` (Dockerfile บรรทัด 18-19) จึงมี `prisma` devDependency ให้ copy ออกมาได้ — ไม่ต้องแก้ base stage

- [ ] **Step 7: ทดสอบว่า image build ผ่าน**

```bash
docker build -t ssar-migrate-test .
```

Expected: build สำเร็จ ไม่มี error `COPY failed: file not found` — ถ้า COPY `node_modules/prisma` พัง ให้ตรวจว่า base stage ยังเป็น `NODE_ENV=development` ตอน `npm ci`

- [ ] **Step 8: ทดสอบว่า entrypoint หยุด container เมื่อ migrate ล้มเหลว**

```bash
docker run --rm -e DATABASE_URL="mysql://nouser:nopass@127.0.0.1:1/nodb" ssar-migrate-test; echo "exit=$?"
```

Expected: log ขึ้น `[entrypoint] running prisma migrate deploy...` ตามด้วย error เชื่อมต่อ DB และ `exit=` ค่าที่ไม่ใช่ 0 — **ห้าม**ขึ้น `starting Next.js server` (พิสูจน์ว่า `set -e` ทำงาน ไม่ serve ด้วย schema ผิด)

- [ ] **Step 9: Commit**

```bash
git add Dockerfile docker-entrypoint.sh
git commit -m "feat(docker): run prisma migrate deploy on container start

Dockerfile เดิมไม่มีขั้น migrate เลย ต้องสร้าง schema ด้วยมือทุกครั้ง"
```

---

### Task 2: ทำให้ vitest นับ test ไม่ซ้ำ

**Files:**
- Modify: `vitest.config.ts:7`
- Test: `lib/__tests__/evidence.test.ts`, `lib/__tests__/files.test.ts` (ของเดิม ใช้ยืนยันผล)

**Interfaces:**
- Consumes: `.gitignore` จาก Task 1 (ignore `.claude/worktrees/` แล้ว)
- Produces: `npx vitest run` รายงาน **2 test files / 17 tests** — ทุกแผนถัดไปใช้ตัวเลขนี้เป็น baseline ตอนตรวจว่า test ใหม่เพิ่มเข้ามาจริง

- [ ] **Step 1: ยืนยันปัญหาก่อนแก้ — test ถูกนับซ้ำ 3 เท่า**

```bash
npx vitest run --reporter=basic 2>&1 | tail -8
```

Expected: เห็น `.claude/worktrees/hopeful-jepsen/lib/__tests__/...` และ `.claude/worktrees/tender-albattani/lib/__tests__/...` ปนมาด้วย และสรุปเป็น `Test Files 6 passed (6)` / `Tests 51 passed (51)`

- [ ] **Step 2: แก้ vitest.config.ts ให้ exclude .claude**

ใน `vitest.config.ts` แทนบรรทัด `exclude` เดิม:

```ts
    exclude: ['node_modules', '.next'],
```

ด้วย:

```ts
    exclude: ['**/node_modules/**', '**/.next/**', '**/.claude/**'],
```

**เหตุผลที่เปลี่ยนเป็น glob ด้วย:** ค่าเดิม `'node_modules'` เป็น pattern ตรงตัว ไม่ match `.claude/worktrees/x/node_modules` — เปลี่ยนเป็น `**/node_modules/**` เพื่อกันไว้ทั้งหมด

- [ ] **Step 3: รัน test ยืนยันว่านับถูกแล้ว**

```bash
npx vitest run --reporter=basic 2>&1 | tail -8
```

Expected: ไม่มีบรรทัดที่ขึ้นต้นด้วย `.claude/` เลย และสรุปเป็น:
```
Test Files  2 passed (2)
     Tests  17 passed (17)
```

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts
git commit -m "fix(test): exclude .claude worktrees from vitest discovery

worktree สำเนา repo ทำให้ test ถูกนับซ้ำ 3 เท่า (51 แทน 17)
ซึ่งบดบังว่ามี test ใหม่เพิ่มเข้ามาจริงหรือไม่"
```

---

## เกณฑ์ปิดแผน

- [ ] `git ls-files prisma/migrations | wc -l` > 18
- [ ] `git status --short` ไม่ขึ้น `.claude/`
- [ ] `docker build .` ผ่าน และ container ที่ต่อ DB ไม่ได้จะ exit ไม่ใช่ serve
- [ ] `npx vitest run` = 2 files / 17 tests
