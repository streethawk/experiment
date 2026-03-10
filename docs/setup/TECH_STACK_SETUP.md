# CareCore SaaS — Tech Stack Setup Guide
> Getting the development environment running from zero

---

## Repository Structure

```
carecore/                           ← monorepo root
├── apps/
│   ├── api/                        ← NestJS backend API
│   │   ├── src/
│   │   │   ├── main.ts             ← bootstrap (security, swagger, pipes)
│   │   │   ├── app.module.ts       ← root module (all feature modules)
│   │   │   ├── health.controller.ts
│   │   │   ├── config/             ← app/db/aws config factories
│   │   │   ├── database/           ← Prisma module (tenant-aware)
│   │   │   ├── common/
│   │   │   │   ├── guards/         ← JwtAuthGuard, RolesGuard
│   │   │   │   ├── interceptors/   ← TenantInterceptor, AuditInterceptor
│   │   │   │   ├── filters/        ← HttpExceptionFilter (RFC 7807)
│   │   │   │   ├── decorators/     ← @Public(), @Roles(), @CurrentUser()
│   │   │   │   └── types/          ← UserRole enum, shared interfaces
│   │   │   └── modules/
│   │   │       ├── auth/           ← JWT auth, MFA (TOTP), refresh tokens
│   │   │       ├── residents/      ← Resident CRUD, admission, discharge
│   │   │       ├── medications/    ← Prescriptions, MAR, controlled drugs
│   │   │       ├── care-notes/     ← Daily notes, wound care, vitals
│   │   │       ├── incidents/      ← Incident reporting, CQC notifications
│   │   │       ├── staff/          ← Staff profiles, training, DBS
│   │   │       ├── rota/           ← Shift scheduling, attendance
│   │   │       ├── finance/        ← Contracts, invoices, payments
│   │   │       ├── inventory/      ← Stock management, purchase orders
│   │   │       ├── compliance/     ← CQC dashboard, audits, DoLS
│   │   │       ├── family-portal/  ← Family-facing endpoints
│   │   │       ├── iot/            ← Device management, alerts
│   │   │       ├── analytics/      ← Reports, dashboards, BI exports
│   │   │       └── notifications/  ← Push, email, SMS notifications
│   │   ├── prisma/
│   │   │   ├── schema.prisma       ← Full database schema (all models)
│   │   │   ├── migrations/         ← Auto-generated migration files
│   │   │   └── seed.ts             ← Development seed data
│   │   ├── test/                   ← E2E tests (Supertest)
│   │   └── package.json
│   │
│   ├── web/                        ← Next.js 15 web app
│   │   ├── src/
│   │   │   ├── app/                ← App Router pages
│   │   │   │   ├── (auth)/         ← login, forgot-password (no layout)
│   │   │   │   ├── (manager)/      ← dashboard, residents, staff, finance
│   │   │   │   ├── (carer)/        ← mobile-optimised carer views
│   │   │   │   └── family/         ← family portal (public-ish)
│   │   │   ├── components/
│   │   │   │   ├── ui/             ← shadcn/ui base components
│   │   │   │   ├── layout/         ← Sidebar, Header, MobileNav
│   │   │   │   └── modules/        ← Feature-specific components
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts   ← Axios with auth + refresh interceptors
│   │   │   │   └── utils.ts        ← cn(), formatDate(), etc.
│   │   │   ├── hooks/              ← useResidents(), useMAR(), etc.
│   │   │   ├── store/              ← Zustand stores (auth, ui, notifications)
│   │   │   └── types/              ← TypeScript types matching API responses
│   │   └── package.json
│   │
│   └── mobile/                     ← React Native + Expo (Phase 4)
│       └── src/
│           ├── screens/
│           ├── components/
│           ├── navigation/
│           ├── hooks/
│           ├── store/
│           └── services/
│
├── packages/
│   ├── types/                      ← Shared TypeScript types (API ↔ web ↔ mobile)
│   ├── ui/                         ← Shared UI components (web + future)
│   └── config/                     ← Shared ESLint, Prettier, TS configs
│
├── infrastructure/
│   ├── docker/
│   │   └── docker-compose.yml      ← Full local stack (PG, Redis, MinIO, etc.)
│   └── terraform/                  ← AWS infrastructure as code (Phase 1 end)
│
├── .github/
│   └── workflows/
│       └── ci.yml                  ← Type check, lint, test, build, deploy
│
├── package.json                    ← Turborepo monorepo root
├── turbo.json                      ← Turbo task pipeline
├── .env.example                    ← Template — copy to .env.local
└── .gitignore
```

---

## Prerequisites

```bash
# Required versions
node --version    # >= 20.0.0
npm --version     # >= 10.0.0
docker --version  # >= 26.0.0
```

---

## Local Setup (Step by Step)

### 1. Clone and install

```bash
git clone https://github.com/your-org/carecore.git
cd carecore
npm install          # installs all workspace dependencies
```

### 2. Environment configuration

```bash
cp .env.example .env.local

# Edit .env.local — minimum required fields:
# DATABASE_URL, REDIS_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
# All others default to local dev values (MinIO, MailHog, etc.)
```

### 3. Start infrastructure services

```bash
cd infrastructure/docker
docker compose up -d postgres redis minio mailhog opensearch

# Verify all services healthy
docker compose ps
```

### 4. Database setup

```bash
# Generate Prisma client from schema
cd apps/api
npx prisma generate

# Run migrations (creates all tables, indexes, RLS policies)
npx prisma migrate dev --name init

# Seed development data (sample org, homes, residents, staff)
npx prisma db seed
```

### 5. Start development servers

```bash
# From monorepo root — starts API + Web concurrently
npm run dev

# Or individually:
npm run dev --filter=@carecore/api    # http://localhost:3000
npm run dev --filter=@carecore/web    # http://localhost:3001
```

### 6. Verify

```bash
# API health check
curl http://localhost:3000/health

# API docs (development only)
open http://localhost:3000/docs

# Web app
open http://localhost:3001

# MinIO console (S3 local)
open http://localhost:9001

# MailHog (email catcher)
open http://localhost:8025
```

---

## Development Credentials (Seed Data)

After running `prisma db seed`, these accounts are available:

| Role | Email | Password | Home |
|---|---|---|---|
| Platform Admin | admin@carecore.co.uk | Dev_Password_1! | — |
| Home Manager | manager@oakwood.co.uk | Dev_Password_1! | Oakwood House |
| Senior Carer | senior@oakwood.co.uk | Dev_Password_1! | Oakwood House |
| Carer | carer@oakwood.co.uk | Dev_Password_1! | Oakwood House |
| Nurse | nurse@oakwood.co.uk | Dev_Password_1! | Oakwood House |
| Family Member | family@example.com | Dev_Password_1! | — (Edith Thompson) |

MFA is disabled for seed accounts in development.

---

## Module Development Pattern

Each feature module follows this structure:

```
modules/residents/
├── residents.module.ts      ← Module definition (imports, providers, exports)
├── residents.controller.ts  ← HTTP endpoints (guards, DTOs, swagger)
├── residents.service.ts     ← Business logic
├── residents.repository.ts  ← Database queries (Prisma)
├── dto/
│   ├── create-resident.dto.ts
│   ├── update-resident.dto.ts
│   └── list-residents.query.ts
├── entities/
│   └── resident.entity.ts   ← Response shape (exclude sensitive fields)
└── residents.spec.ts        ← Unit tests
```

### Guard Pattern

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)   // always both
@Roles(UserRole.SENIOR_CARER)          // minimum role required
@Get(':id')
findOne(@Param('id') id: string) { ... }
```

### Tenant Context

All DB queries must be scoped to the current home. The `TenantInterceptor`
sets `request.homeId` from the `X-Home-ID` header (validated against JWT claims).
Services receive `homeId` as a parameter — never trust the request body for homeId.

```typescript
// ✓ Correct — homeId from verified JWT claim via interceptor
async findAll(homeId: string, query: ListResidentsQuery) {
  return this.prisma.resident.findMany({
    where: { homeId, deletedAt: null, status: query.status }
  });
}

// ✗ Wrong — never trust homeId from request body
async findAll(body: { homeId: string }) { ... }
```

---

## Testing Strategy

### Unit tests (Jest)
```bash
npm run test --filter=@carecore/api
# Each service tested with mocked Prisma using jest-mock-extended
```

### Integration tests (Supertest + real DB)
```bash
npm run test:e2e --filter=@carecore/api
# Spins up test DB, runs migrations, tests full HTTP stack
```

### E2E tests (Playwright)
```bash
npm run test:e2e --filter=@carecore/web
# Tests critical user journeys: login → MAR → incident → logout
```

### Key test scenarios
- Login + MFA flow
- Resident admission → care plan creation → MAR administration
- Incident report → CQC notification workflow
- Invoice generation → payment recording
- Family portal read-only access (cannot see other residents)
- RLS: user from Home A cannot access Home B data

---

## Adding a New Module

```bash
# 1. Generate NestJS module scaffold
cd apps/api
npx nest generate module modules/my-module
npx nest generate controller modules/my-module
npx nest generate service modules/my-module

# 2. Add Prisma model to schema.prisma

# 3. Create migration
npx prisma migrate dev --name add_my_module

# 4. Add to AppModule imports in app.module.ts

# 5. Add routes to API_DESIGN.md

# 6. Add shared types to packages/types/
```

---

## Environment Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_HOST` | Yes | Redis host |
| `REDIS_PASSWORD` | Yes | Redis password |
| `JWT_SECRET` | Yes | Min 64 chars — access token signing |
| `JWT_REFRESH_SECRET` | Yes | Min 64 chars — refresh token signing |
| `AWS_REGION` | Yes | Always `eu-west-2` |
| `S3_BUCKET` | Yes | Document storage bucket |
| `S3_ENDPOINT` | Dev | Override for MinIO local |
| `SES_ENDPOINT` | Dev | Override for MailHog local |
| `OPENSEARCH_URL` | Yes | Audit log store |
| `NHS_SPINE_BASE_URL` | Phase 3 | NHS integration |
| `XERO_CLIENT_ID` | Phase 2 | Finance integration |
| `DATADOG_API_KEY` | Prod | Monitoring |
| `SENTRY_DSN` | Staging+ | Error tracking |

---

## Deployment (Production)

CI/CD deploys automatically to staging on merge to `develop`.
Production requires manual approval in GitHub Environments.

```
develop branch  →  auto-deploy to staging (ECS Fargate)
main branch     →  manual approval  →  deploy to production (ECS Fargate)
```

Terraform configs in `infrastructure/terraform/` manage:
- VPC, subnets, security groups
- ECS cluster, task definitions, services
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis
- S3 buckets (encrypted, versioned, lifecycle)
- CloudFront distributions
- WAF rules
- Secrets Manager

---

*Setup guide version: 1.0 — March 2026*
