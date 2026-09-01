# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**QA Evidence Center (สมศ.)** — ระบบจัดการหลักฐานการประกันคุณภาพภายนอกสำหรับสำนักงานรับรองมาตรฐานและประเมินคุณภาพการศึกษา (สมศ.), รองรับ 2 ระดับการศึกษา: `EARLY_CHILDHOOD` (ปฐมวัย) และ `BASIC` (ขั้นพื้นฐาน). See [README.md](README.md) for user-facing docs.

## Commands

```bash
npm run dev              # dev server via scripts/run-dev.cjs (auto-kills stale process on the port, prints LAN URL)
npm run build             # next build
npm run lint               # next lint (ESLint: next/core-web-vitals + @typescript-eslint + prettier)

npm run db:generate        # prisma generate
npm run db:migrate         # prisma migrate dev
npm run db:seed            # tsx prisma/seed.ts
npm run db:reset           # prisma migrate reset --force && seed (idempotent — safe to rerun)
npm run db:studio          # prisma studio

npm test                   # vitest (unit tests, lib/__tests__/*.test.ts)
npm run test:watch         # vitest --watch
npx vitest run lib/__tests__/evidence.test.ts   # run a single test file
npm run test:e2e           # playwright test (playwright/*.spec.ts, smoke tests)
```

Seeded login credentials (see README.md): `admin@example.com` / `admin123`, plus `qalead@`, `teacher@`, `assessor@`, `director@`, `areaadmin@` with role-matching passwords.

## Architecture

### Stack
Next.js 15 (App Router) + TypeScript strict · Prisma ORM + MySQL 8.0 · NextAuth.js (Credentials) · Tailwind CSS + shadcn/ui (Radix primitives) + antd (some pickers) · Zustand · TanStack Query · react-hook-form + Zod · recharts · Vitest (unit) + Playwright (E2E).

### The PQA framework — read this before touching Evidence/QA/PA code
The whole data model is organized around **PQA (Performance–Quality Alignment)**, documented in detail in [docs/PQA_FRAMEWORK.md](docs/PQA_FRAMEWORK.md). The short version: `Evidence` is a shared base record — a single piece of evidence can back both:
- **QA (organization-level quality)**: `EduLevel → QAStandard → QAIndicator`, linked via `Evidence.indicatorId` / `indicatorCodes`. Drives completeness scoring, pass-criteria, dashboards.
- **PA (individual performance agreements)**: `PAAspect → PAIndicator → PAAgreementItem`, linked via `PAEvidenceMapping` (evidence ↔ agreement item or challenge consideration). Drives PA scoring and pass/fail.

When adding a feature that touches Evidence, check whether it needs a QA-side link (`indicatorId`), a PA-side link (`PAEvidenceMapping`), or both — don't assume one implies the other.

### Multi-tenancy & RBAC (see [docs/DATABASE_SCOPE_AND_ROLES.md](docs/DATABASE_SCOPE_AND_ROLES.md))
- **School** has an optional `areaId` → `EducationServiceArea` (education service area / เขตพื้นที่การศึกษา, สพป./สพม.) — supports multi-district, all schools nationwide (สพฐ.).
- Two levels of role assignment:
  - **School-level**: `UserSchoolRole` (userId + schoolId + roleId) — roles: `TEACHER`, `SCHOOL_DIRECTOR`, `SCHOOL_ADMIN`, `QA_LEAD`, `ASSESSOR`.
  - **Area-level**: `UserAreaRole` (userId + areaId + roleId) — roles: `AREA_HEAD_OFFICE`, `AREA_ADMIN` — see every school where `School.areaId` matches.
  - `ADMIN` sees everything.
- Scoping helpers live in [lib/auth/scoping.ts](lib/auth/scoping.ts): `getUserSchools(userId)` returns accessible `sc_id`s, `canAccessSchool(userId, schoolId)` checks a single school. **Always** filter queries through these rather than trusting client-supplied schoolId.
- Route-level RBAC is enforced centrally in [middleware.ts](middleware.ts) via a `RBAC_RULES` pattern list (path regex → allowed role codes, optionally scoped to specific HTTP methods). File-upload POSTs (`multipart/form-data` to `/files` or `/api/evidence` routes) skip RBAC in middleware and are re-checked inside the API route — this exists to avoid Next's body-consumption issues with large uploads (see next.config.js `bodySizeLimit`/`middlewareClientMaxBodySize`, both set to 1000mb for video).

### Thai calendar conventions
Two parallel year systems are used throughout (Evidence, DevelopmentSummary, Project, etc.) — pick the correct one per feature, don't assume they're interchangeable:
- **`fiscalYear`** (ปีงบประมาณ, Oct→Sep): Oct–Dec = CE year + 543, Jan–Sep = CE year + 542.
- **`academicYear`** (ปีการศึกษา, May→Apr): May–Dec = CE year + 543, Jan–Apr = CE year + 542.
- Helpers: `thaiFiscalYear(d)` / `thaiAcademicYear(d)` in [lib/evidence.ts](lib/evidence.ts).
- All dates are stored in DB as Gregorian/UTC; conversion to Buddhist Era happens only at the UI boundary.
- Note: `Evidence.fiscalYear` is historically overloaded — `nextEvidenceCode()` actually keys the per-indicator running counter off what's passed as `academicYear` into that field. Check call sites before assuming the field name matches its semantic use.

### Evidence code generation
Format `${indicator.code}-${running2digits}` (e.g. `2.3-01`), scoped per indicator per year via `nextEvidenceCode(indicatorId, academicYear)` in [lib/evidence.ts](lib/evidence.ts) — counts existing non-deleted Evidence rows for that indicator/year and increments.

### File storage — never binary in DB
`EvidenceFile` / `TeachingMediaFile` / `LessonPlanFile` / `ProjectFile` all store **metadata only**:
- `storageType`: `URL | YOUTUBE | GDRIVE | CANVA | LINK` (enum `EvidenceStorageType`)
- `storagePath` (local files under `public/uploads/...`), `driveFileId`, `externalUrl`, `thumbnailUrl`, `fileUrls` (JSON array for multi-image groups)
- Upload root resolved via `getUploadBaseDir()` in [lib/uploads-path.ts](lib/uploads-path.ts) — respects `UPLOAD_DIR`/`PUBLIC_UPLOAD_DIR` env vars for Docker deployments, defaults to `public/uploads`.
- Images: up to 20 per group, first is thumbnail, stored as one record with `fileUrls` JSON array. Videos: 1 file, ≤1000MB, thumbnail auto-generated via ffmpeg at 10s. In production, uploaded files are served through the `/api/serve-upload/:path*` rewrite (see `next.config.js`) rather than directly from `public/` — Next standalone output doesn't serve files added to `public/` at runtime.

### Directory layout
```
app/
  actions/          # Server Actions (form submissions) — evidence, project, lesson-plan, teaching-media, external-evaluation, auth
  api/               # Route handlers — used for file uploads and anything needing custom status codes/streaming
  admin/ dashboard/ evaluation/ evidence/ extra-programs/ lesson-plans/
  pa/ projects/ reports/ setup/ teaching-media/ work-collection/   # feature route segments (App Router)
lib/
  auth/              # nextauth.ts (NextAuth config), scoping.ts (RBAC/school-scoping helpers)
  validations/       # Zod schemas, one file per feature domain
  queries/           # shared Prisma query helpers
  indicators/        # completeness.ts, pass-criteria.ts, development-summary.ts, narrative-report.ts, pptx-generator.ts
  ai/                # gemini.ts (Google Generative AI), indicator-mapping.ts (AI-assisted QA indicator suggestion)
  evidence.ts        # thaiFiscalYear/thaiAcademicYear/nextEvidenceCode — core PQA helpers
  db.ts              # Prisma client singleton
prisma/
  schema.prisma      # source of truth for the data model
  seed.ts, seed-data.ts, seed-pa.ts   # idempotent seeds (upsert-based)
docs/                # feature design docs + raw SQL migration snippets (read before touching PA/SAR/ID-plan/project features)
```

### Feature modules built on the shared Evidence/PQA base
Several "extra program" (โปรแกรมเสริม) features layer on top of School/User but are otherwise independent of Evidence: `TeachingMedia`, `LessonPlan`, `PATeacherDocument`/`TeacherSarDocument`/`TeacherIdPlan` (PA 1/ส-3/ส, SAR, ID plan — one record per teacher per school per academicYear, enforced via `@@unique`), `CommunityTeachingRecord` (one per teacher per semester), and `Project` (โครงการ, linked optionally to an `OBECPolicy`, a `QAIndicator`, and a `PAIndicator` simultaneously). Check the relevant `docs/*_DEPLOY.md` / `*_TABLE.sql` file before modifying one of these — they were added incrementally via raw SQL alongside Prisma migrations.

### Audit logging
Critical actions (`CREATE_EVIDENCE`, `UPDATE_EVIDENCE_STATUS`, `UPLOAD_FILE`, `CREATE_REVIEW`, `LOGIN`, `LOGOUT`, etc.) are logged to `AuditLog` (actor, school, action, targetTable, targetId, payload) — use [lib/audit.ts](lib/audit.ts) when adding new mutating actions.

## Conventions

- IDs are `BigInt` everywhere (Prisma default) — remember to convert to `string` before `JSON.stringify`/`NextResponse.json` (BigInt doesn't serialize natively).
- Dates render in Buddhist Era (พ.ศ.) in the UI; DB storage stays Gregorian/UTC.
- Seeds must be idempotent (`upsert` or existence-check) — `npm run db:reset` needs to be safely rerunnable.
- Zod validation for all inputs, RBAC + school-scoping check in every route/action, audit log on critical writes.
- Prettier + `prettier-plugin-tailwindcss` formats class ordering — don't hand-order Tailwind classes.
