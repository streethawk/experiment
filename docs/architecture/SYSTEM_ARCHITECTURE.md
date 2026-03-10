# CareCore SaaS — System Architecture
> UK Care Home Management Platform — Technical Architecture Document

---

## 1. Architecture Overview

CareCore is a multi-tenant, cloud-native SaaS platform deployed exclusively on AWS
eu-west-2 (London) to satisfy UK data residency requirements for special category
health data under GDPR Article 9.

The system follows a **modular monolith** approach for Phase 1-2, with clear service
boundaries that allow extraction into microservices as individual domains require
independent scaling (IoT processing, analytics, notifications).

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS & CLIENTS                                │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Web App     │  │  Mobile App  │  │  Family      │  │  IoT Devices  │  │
│  │  (Next.js)   │  │  (RN/Expo)   │  │  Portal      │  │  & Wearables  │  │
│  │  Staff/Mgmt  │  │  Care Staff  │  │  (Next.js)   │  │  (MQTT)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
└─────────┼────────────────-┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE & SECURITY LAYER                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AWS WAF  (OWASP rules, rate limiting, geo-blocking)                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  CloudFront CDN  (static assets, family portal, TLS 1.3)           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  AWS Shield Standard  (DDoS protection)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  API Gateway  (REST + WebSocket endpoints, throttling, API keys)    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Auth Layer  (Cognito / Auth0)                                       │   │
│  │  • MFA enforcement (TOTP/SMS)                                        │   │
│  │  • Short-lived JWTs (15-min access, 8-hr refresh)                   │   │
│  │  • RBAC token claims                                                 │   │
│  │  • Break-glass access with auto-audit alert                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │  (Private VPC)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER  (ECS Fargate)                    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                      API Server (NestJS / TypeScript)              │    │
│  │                                                                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │    │
│  │  │ Resident │ │  Staff   │ │ Clinical │ │ Finance  │ │Comply  │  │    │
│  │  │ Module   │ │  Module  │ │ Module   │ │ Module   │ │Module  │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │    │
│  │  │ Inventory│ │  Family  │ │  Rota    │ │Analytics │ │ IoT    │  │    │
│  │  │ Module   │ │  Portal  │ │  Module  │ │ Module   │ │Gateway │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘  │    │
│  │                                                                    │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │  Cross-Cutting: Audit Logger │ Notifier │ File Handler      │  │    │
│  │  │                  RBAC Guard  │ Tenant Resolver │ Event Bus  │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────────────────┐    │
│  │  WebSocket Server    │  │  Background Job Workers (ECS)           │    │
│  │  (real-time alerts,  │  │  • Report generation                    │    │
│  │   live task updates, │  │  • Invoice batch processing             │    │
│  │   IoT event push)    │  │  • Notification dispatch                │    │
│  └──────────────────────┘  │  • NHS integration sync                 │    │
│                             │  • Data export (BI connectors)         │    │
│                             └─────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                      │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │  PostgreSQL      │  │  Redis Cluster  │  │  TimescaleDB            │    │
│  │  RDS Multi-AZ   │  │  (ElastiCache)  │  │  (IoT time-series)      │    │
│  │  Primary DB     │  │  Sessions/Cache │  │  Vitals, sensor data    │    │
│  │  Row-level sec  │  │  Rate limiting  │  │                         │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  OpenSearch (Elasticsearch) │  │  S3 (Encrypted)                     │  │
│  │  Audit logs (immutable)     │  │  Documents, photos, exports         │  │
│  │  Full-text search           │  │  Versioned, lifecycle policies      │  │
│  │  Compliance evidence index  │  │  Pre-signed URL access only         │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenancy Model

### Tenant Hierarchy

```
Platform (CareCore)
  │
  ├── Organisation (Care Group)      e.g. "Sunrise Care Ltd"
  │     ├── metadata, subscription, billing
  │     └── group-level admin users
  │
  └── Home (Registered Location)     e.g. "Oakwood House, Bristol"
        ├── CQC registration number
        ├── registered_manager_id
        ├── Wing A
        │     ├── Floor 1
        │     │     ├── Room 101  ──► Resident (current occupant)
        │     │     └── Room 102  ──► Resident
        │     └── Floor 2
        └── Wing B
```

### Isolation Strategy

**Database**: Shared schema with `organisation_id` and `home_id` on all tables.
Row-level security (RLS) policies in PostgreSQL enforce tenant isolation at the
database level — application bugs cannot leak cross-tenant data.

```sql
-- Example RLS policy
CREATE POLICY tenant_isolation ON residents
  USING (home_id = current_setting('app.current_home_id')::uuid);
```

**Application**: Tenant resolver middleware extracts `home_id` from JWT claims
and sets `app.current_home_id` on the DB session before every query.

**Audit**: All audit log entries include `organisation_id`, `home_id`, `user_id`,
`ip_address`, `resource_type`, `resource_id`, `action`, `before_state`, `after_state`.

---

## 3. Technology Stack

### Frontend

| Layer | Technology | Rationale |
|---|---|---|
| Web framework | Next.js 14 (App Router) | SSR, excellent DX, strong ecosystem |
| Language | TypeScript | Type safety critical for healthcare data |
| UI components | shadcn/ui + Radix UI | Accessible (WCAG 2.1 AA), composable |
| Styling | Tailwind CSS | Rapid development, consistent design system |
| Server state | React Query (TanStack) | Caching, optimistic updates, background sync |
| Client state | Zustand | Lightweight, no boilerplate |
| Forms | React Hook Form + Zod | Validation schemas reused with API contracts |
| Charts | Recharts + Tremor | Care dashboards, vitals trending |
| Real-time | Socket.io client | IoT alerts, task updates, live rota changes |
| Testing | Vitest + Playwright | Unit + E2E |

### Mobile App (Care Staff)

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React Native + Expo | Code sharing with web, fast iteration |
| Language | TypeScript | Shared types with backend |
| Navigation | React Navigation v6 | De-facto standard |
| Offline storage | WatermelonDB | Relational offline DB with sync |
| Sync | Custom sync queue | Queue actions offline, replay on reconnect |
| Notifications | Expo Notifications + FCM/APNs | Real-time IoT and task alerts |
| Camera | Expo Camera | Wound photos, body map capture |
| Voice | Expo Speech / Whisper API | Voice-to-text for care notes |

### Backend

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20 LTS | Large ecosystem, TypeScript native |
| Framework | NestJS | Modular, decorator-based, enterprise-grade |
| Language | TypeScript | End-to-end type safety |
| API style | REST (CRUD) + WebSocket (real-time) | REST for operations, WS for live events |
| API schema | OpenAPI 3.1 (auto-generated) | Client SDK generation, documentation |
| ORM | Prisma | Type-safe queries, migration management |
| Validation | Zod | Runtime schema validation, shared with frontend |
| Job queue | BullMQ (Redis-backed) | Reliable background jobs, retry logic |
| Event bus | AWS EventBridge | Async module decoupling, future microservice extraction |
| Testing | Jest + Supertest | Unit, integration, API tests |

### Data

| Store | Technology | Use Case |
|---|---|---|
| Primary DB | PostgreSQL 16 (RDS) | All operational data |
| Cache | Redis 7 (ElastiCache) | Sessions, rate limits, job queues |
| Time-series | TimescaleDB (RDS extension) | IoT vitals, wearable data |
| Search/Audit | Amazon OpenSearch | Audit logs, full-text search |
| Documents | S3 + KMS | Files, photos, exports (encrypted) |
| Analytics | Redshift (Phase 4) | BI data warehouse, Tableau/Power BI |

### Infrastructure

| Component | Technology |
|---|---|
| Cloud | AWS eu-west-2 (London only) |
| Compute | ECS Fargate (containers, no server management) |
| Container registry | ECR |
| IaC | Terraform (modules per environment) |
| Secrets | AWS Secrets Manager |
| Parameters | AWS SSM Parameter Store |
| CI/CD | GitHub Actions |
| Monitoring | Datadog (APM, logs, metrics, alerts) |
| Error tracking | Sentry |
| Uptime | PagerDuty (on-call alerting) |
| DNS | Route 53 |
| CDN | CloudFront |
| Email | AWS SES (transactional), SendGrid (marketing) |
| SMS | AWS SNS or Twilio (MFA, staff alerts) |
| Video | Daily.co or AWS Chime SDK (family video calls) |

---

## 4. AWS Infrastructure Detail

### Network Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  VPC: 10.0.0.0/16  (eu-west-2)                                       │
│                                                                      │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐  │
│  │  AZ: eu-west-2a            │  │  AZ: eu-west-2b                │  │
│  │                            │  │                                │  │
│  │  Public Subnet             │  │  Public Subnet                 │  │
│  │  10.0.1.0/24               │  │  10.0.2.0/24                  │  │
│  │  [NAT Gateway]             │  │  [NAT Gateway]                 │  │
│  │  [ALB node]                │  │  [ALB node]                    │  │
│  │                            │  │                                │  │
│  │  Private App Subnet        │  │  Private App Subnet            │  │
│  │  10.0.11.0/24              │  │  10.0.12.0/24                 │  │
│  │  [ECS Tasks - API]         │  │  [ECS Tasks - API]             │  │
│  │  [ECS Tasks - Workers]     │  │  [ECS Tasks - Workers]         │  │
│  │                            │  │                                │  │
│  │  Private Data Subnet       │  │  Private Data Subnet           │  │
│  │  10.0.21.0/24              │  │  10.0.22.0/24                 │  │
│  │  [RDS Primary]             │  │  [RDS Standby]                 │  │
│  │  [ElastiCache]             │  │  [ElastiCache replica]         │  │
│  │  [OpenSearch]              │  │  [OpenSearch replica]          │  │
│  └────────────────────────────┘  └────────────────────────────────┘  │
│                                                                      │
│  VPC Endpoints (no internet traversal):                              │
│  S3, ECR, Secrets Manager, SSM, CloudWatch, SQS, EventBridge        │
└──────────────────────────────────────────────────────────────────────┘
```

### ECS Service Architecture

```
Application Load Balancer
  │
  ├── Target Group: API (port 3000)
  │     └── ECS Service: carecore-api
  │           ├── Task (2 vCPU, 4GB) — min 2, max 10 (auto-scale on CPU/RPS)
  │           └── Task (2 vCPU, 4GB)
  │
  ├── Target Group: WebSocket (port 3001)
  │     └── ECS Service: carecore-ws
  │           ├── Task (1 vCPU, 2GB) — sticky sessions
  │           └── Task (1 vCPU, 2GB)
  │
  └── Target Group: Workers (internal only)
        └── ECS Service: carecore-workers
              └── Task (2 vCPU, 4GB) — min 1, max 5 (queue depth scale)
```

### IoT Architecture

```
IoT Devices (Fall detectors, wearables, BP monitors)
  │
  │  [MQTT over TLS 1.3]
  ▼
AWS IoT Core
  │
  ├── IoT Rules Engine
  │     ├── Rule: vitals/* → Lambda → TimescaleDB
  │     ├── Rule: alerts/fall/* → SQS → Worker → WebSocket push + DB
  │     ├── Rule: alerts/critical/* → SNS → PagerDuty + SMS to on-call nurse
  │     └── Rule: device/status/* → Lambda → device health table
  │
  └── Device Shadow (last known state per device)
```

---

## 5. Data Architecture

### Core Schema Design

```
-- Tenant foundation
organisations        (id, name, type, subscription_tier, created_at)
homes                (id, organisation_id, name, cqc_registration_no, address, ...)
wings                (id, home_id, name, floor)
rooms                (id, wing_id, room_number, room_type, capacity)

-- Resident lifecycle
residents            (id, home_id, room_id, nhs_number, status, admission_date, ...)
admissions           (id, resident_id, referral_source, admitted_by, ...)
care_plans           (id, resident_id, version, created_at, approved_by, content_json)
risk_assessments     (id, resident_id, type, score, assessed_by, valid_until, ...)
care_notes           (id, resident_id, staff_id, shift, category, note, created_at)
incidents            (id, home_id, resident_id, type, severity, status, ...)

-- Clinical
medications          (id, resident_id, drug_name, dose, route, frequency, ...)
mar_entries          (id, medication_id, scheduled_at, administered_at, staff_id, outcome, ...)
controlled_drug_log  (id, home_id, drug, action, quantity, balance, witness_id, ...)
vitals               (id, resident_id, type, value, unit, recorded_at, source)
wounds               (id, resident_id, site, classification, stage, ...)
wound_assessments    (id, wound_id, assessed_at, push_score, photo_s3_key, ...)

-- Staff
staff                (id, organisation_id, name, role, employment_type, ...)
certifications       (id, staff_id, type, issued_at, expires_at, verified)
shifts               (id, home_id, staff_id, start_time, end_time, role, ...)
attendance           (id, shift_id, clocked_in, clocked_out, ...)

-- Finance
resident_contracts   (id, resident_id, start_date, room_rate, care_uplift, ...)
funding_sources      (id, resident_id, type, funder_name, weekly_rate, ...)
invoices             (id, resident_id, period_start, period_end, amount, status, ...)
payments             (id, invoice_id, amount, method, reference, received_at)

-- Compliance
dols_records         (id, resident_id, application_date, outcome, expiry, ...)
mca_assessments      (id, resident_id, decision_topic, capacity_found, assessed_by, ...)
safeguarding_records (id, home_id, resident_id, type, referral_date, status, ...)
cqc_notifications    (id, home_id, incident_id, notif_type, submitted_at, ...)

-- Audit (append-only, never updated or deleted)
audit_logs           (id, org_id, home_id, user_id, ip, resource_type,
                      resource_id, action, before_state, after_state, created_at)
gdpr_access_logs     (id, org_id, user_id, resident_id, action, purpose, created_at)
```

### Data Retention Policy

| Data Type | Retention | Basis |
|---|---|---|
| Resident care records | 8 years post-discharge (adults) | NHS/CQC guidance |
| Children's records | Until age 25, or 8 years post-discharge | Children Act |
| Staff records | 7 years post-employment | HMRC / employment law |
| Audit logs | 7 years | GDPR accountability |
| CCTV (if integrated) | 31 days | ICO guidance |
| Financial records | 7 years | Companies Act / HMRC |
| Incident records | 10 years | Statute of limitations |
| Controlled drug registers | 2 years | Misuse of Drugs Regulations |

---

## 6. Security Architecture

### Authentication & Authorisation

```
┌─────────────────────────────────────────────────────────────────┐
│  Identity Provider (Auth0 / Cognito)                            │
│  • MFA: TOTP (Authenticator app) — mandatory for all users      │
│  • SMS fallback for low-tech staff devices                      │
│  • Device trust: trusted devices skip MFA for 30 days           │
│  • Brute force: lockout after 5 attempts, progressive delays    │
└──────────────────────────────┬──────────────────────────────────┘
                               │  JWT (15-min access token)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  RBAC Model                                                     │
│                                                                 │
│  Role               Scope        Key Permissions                │
│  ─────────────────  ───────────  ──────────────────────────     │
│  Platform Admin     Platform     All (internal CareCore staff)  │
│  Group Admin        Org          All homes in org, billing      │
│  Home Manager       Home         All operations, staff HR       │
│  Registered Manager Home         Clinical oversight, CQC        │
│  Senior Carer       Home         Care records, MAR, incidents   │
│  Carer              Home         Care notes, tasks (own shift)  │
│  Nurse              Home         MAR + controlled drugs         │
│  Finance Admin      Home         Billing, contracts, no care    │
│  Family Member      Resident     Own resident portal only       │
│  GP / External      Resident     Read-only clinical summary     │
└─────────────────────────────────────────────────────────────────┘
```

### Data Encryption

```
At Rest:
  • RDS: AWS KMS customer-managed keys (CMK), per-tenant key rotation
  • S3: SSE-KMS with bucket policies denying non-encrypted puts
  • ElastiCache: encryption at rest enabled
  • OpenSearch: encryption at rest with KMS
  • EBS volumes (ECS tasks): encrypted

In Transit:
  • TLS 1.3 minimum enforced at WAF, ALB, and all internal service comms
  • Certificate Manager (ACM) for public certificates, auto-renewed
  • Internal service mesh: mutual TLS (mTLS) via App Mesh (Phase 3)
  • IoT device connections: TLS 1.3 + X.509 device certificates

Application-Level:
  • NHS numbers: encrypted at rest in DB column (pgcrypto)
  • Special category fields (diagnosis, mental health): field-level encryption
  • Photo/document content: client-side hash verification on upload
```

### Security Controls

| Control | Implementation |
|---|---|
| WAF rules | OWASP Top 10, AWS Managed Rules, custom rate limits |
| Input validation | Zod schemas at API boundary, parameterised queries via Prisma |
| SQL injection | Prisma ORM (no raw queries in application code) |
| XSS | Content Security Policy headers, React auto-escaping |
| CSRF | SameSite=Strict cookies, CSRF tokens on state-changing forms |
| Session management | Redis-backed, server-side invalidation, 15-min idle timeout |
| API rate limiting | Per-user: 100 req/min; per-IP: 500 req/min; burst protection |
| Break-glass access | Elevated access triggers immediate alert to Group Admin + audit |
| Dependency scanning | Dependabot + Snyk in CI pipeline |
| Container scanning | Trivy in CI, ECR image scanning |
| Secrets detection | GitGuardian in CI pipeline |
| Pen testing | External CREST-approved tester, annually + pre-launch |

---

## 7. Integration Architecture

### NHS Integration Layer

```
CareCore API
  │
  └── NHS Integration Service
        │
        ├── NHS Spine / PDS (Patient Demographics Service)
        │     Protocol: HL7 FHIR R4 over HTTPS
        │     Use: Verify NHS number at admission, retrieve demographics
        │     Auth: NHS Identity Service (OAuth2 + mTLS)
        │
        ├── GP Connect (EMIS / SystmOne)
        │     Protocol: FHIR R4 (GP Connect API)
        │     Use: Read medications, allergies, conditions at admission
        │     Auth: NHS Identity Service + Spine Security Proxy (SSP)
        │
        ├── SCR (Summary Care Record)
        │     Protocol: HL7 v3 / FHIR
        │     Use: Point-of-care medication/allergy view for nurses
        │     Auth: Smartcard / NHS login
        │
        └── EPS (Electronic Prescription Service)
              Protocol: HL7 v3 / FHIR R4
              Use: Issue and track prescriptions to dispensing pharmacy
              Auth: NHS Identity, prescriber registration
```

### Third-Party Integrations

```
Finance:
  Xero         → REST API, OAuth2, webhook for payment sync
  QuickBooks   → REST API, OAuth2, sandbox + production environments

Pharmacy:
  Pharmex      → HL7 v2 / proprietary API (TBC per vendor)
  Lloyds PM    → FTP/SFTP batch (legacy), REST (newer versions)

HR / Payroll:
  Sage Payroll → CSV export (Phase 2), API (Phase 3)
  BrightHR     → REST API, staff import/export

IoT Devices:
  Tunstall     → Tunstall Connect API / MQTT
  Tynetec      → REST + WebSocket
  Courtney Thorne → HTTPS REST (call bell events)
  Omron / A&D  → Bluetooth LE → Mobile App → API

Analytics:
  Power BI     → REST API data connector / ODBC
  Tableau      → REST API / JDBC
  Redshift     → Direct connection (Phase 4)
```

### Integration Pattern

All third-party integrations follow an **Adapter pattern** behind an internal
port interface. This isolates the core domain from external API changes:

```
Core Domain
    │
    └── IntegrationPort (interface)
          ├── XeroAdapter       implements FinancePort
          ├── NHSSpineAdapter   implements PatientVerificationPort
          ├── GPConnectAdapter  implements ClinicalRecordPort
          └── TunstallAdapter   implements IoTAlertPort
```

---

## 8. Real-Time Architecture

### Event Flow

```
Source Event                Processing               Delivery
─────────────────────────────────────────────────────────────────────
Fall detector triggers  →  IoT Rule → SQS → Worker  → WS push (30s)
                                            → SMS to on-call nurse
                                            → Incident pre-populated

MAR due in 15 min       →  Scheduled job  → WS push  → Carer device

Care task overdue       →  BullMQ worker  → WS push  → Senior carer

Vitals out of range     →  Lambda         → WS push  → Nurse station
                                            → Alert in care notes

Staff ratio low         →  Rota watcher   → WS push  → Home manager
                                            → Email alert
```

### WebSocket Channels

```
/ws/home/{home_id}/alerts       — IoT alerts, ratio warnings (all staff)
/ws/home/{home_id}/tasks        — Task due/overdue (per-shift)
/ws/resident/{resident_id}      — Resident-specific updates (keyworker)
/ws/rota/{home_id}              — Shift changes, shift cover requests
/ws/family/{resident_id}        — Family portal updates (family users)
```

---

## 9. Offline Architecture (Mobile)

Care staff frequently work in areas with poor WiFi. The mobile app must be
fully functional offline for core care delivery tasks.

```
Online Mode:
  App ←→ API  (real-time sync, full feature set)

Offline Mode:
  App ←→ Local WatermelonDB  (SQLite on device)
         • Full shift's resident list and care plans pre-fetched
         • MAR chart for next 24 hours cached
         • Care note entry queued locally
         • Task completion queued locally
         • Photos stored locally (compressed)

Reconnection:
  1. Conflict detection (server-wins for clinical data, merge for notes)
  2. Outbox queue replayed in chronological order
  3. Server timestamps used for ordering
  4. Failed sync items surfaced to user with resolution UI
  5. Never silently discard — every action must succeed or be flagged
```

---

## 10. Observability & Monitoring

### Monitoring Stack

```
┌───────────────────────────────────────────────────────────────┐
│  Datadog                                                      │
│  ├── APM: distributed traces (API → DB → external)           │
│  ├── Logs: structured JSON logs, searchable                   │
│  ├── Metrics: custom business metrics (MAR completions, etc.) │
│  ├── Synthetics: uptime checks on critical user journeys      │
│  └── Dashboards: per-home, per-module, SLA tracking          │
├───────────────────────────────────────────────────────────────┤
│  Sentry: frontend + backend error tracking, release health    │
├───────────────────────────────────────────────────────────────┤
│  PagerDuty: on-call rotation, escalation policies             │
│  ├── P1: DB down, IoT alert failure → immediate page          │
│  ├── P2: API error rate >1% → 5-min page                     │
│  └── P3: Slow queries, queue depth → business hours alert     │
└───────────────────────────────────────────────────────────────┘
```

### Key Metrics (SLIs)

| Metric | Target | Alert Threshold |
|---|---|---|
| API availability | 99.9% | <99.5% in 5 min |
| API p99 latency | <500ms | >1s in 5 min |
| IoT alert delivery latency | <60s | >120s |
| MAR chart load time | <2s | >4s |
| WebSocket connection success | >99% | <97% |
| DB replication lag | <100ms | >1s |
| Failed login rate | <0.1% | >1% (brute force) |

### Structured Logging

Every log line is JSON with mandatory fields:

```json
{
  "timestamp": "2026-03-10T14:23:01.234Z",
  "level": "info",
  "trace_id": "abc-123",
  "organisation_id": "org-uuid",
  "home_id": "home-uuid",
  "user_id": "user-uuid",
  "module": "mar",
  "action": "administration_recorded",
  "resident_id": "resident-uuid",
  "duration_ms": 43,
  "status": "success"
}
```

---

## 11. Disaster Recovery

### Backup Strategy

| Asset | Backup | RTO | RPO |
|---|---|---|---|
| RDS PostgreSQL | Automated daily snapshot + continuous WAL to S3 | 4 hours | 5 minutes |
| S3 documents | Cross-region replication to eu-west-1 (Ireland) | 1 hour | Near-zero |
| OpenSearch | Daily snapshots to S3 | 4 hours | 24 hours |
| Redis | ElastiCache daily backup | 15 min (rebuild from DB) | 24 hours |
| Terraform state | S3 with versioning + locking | N/A | N/A |

### Recovery Runbooks
- Automated failover: RDS Multi-AZ promotes standby in <2 min
- Manual runbooks in Confluence for each failure scenario
- Quarterly DR drills (test restore to staging environment)
- Chaos engineering (Phase 3): AWS Fault Injection Simulator

---

## 12. Development Workflow

### Environments

```
Local Dev  →  Feature Branch  →  PR  →  Staging  →  UAT  →  Production
                                   ↑                    ↑
                              Auto-deploy          Manual approval
                              (GitHub Actions)     (care home UAT sign-off)
```

### Branch Strategy

```
main          — production, protected, requires PR + 2 approvals
staging       — staging environment, auto-deploy on merge
develop       — integration branch, auto-deploy to dev environment
feature/*     — individual feature branches, PRs to develop
hotfix/*      — direct to main via emergency PR process
```

### CI Pipeline (GitHub Actions)

```yaml
On PR:
  1. Type check (tsc --noEmit)
  2. Lint (ESLint + Prettier)
  3. Unit tests (Jest)
  4. Integration tests (DB in Docker)
  5. Security scan (Snyk, GitGuardian)
  6. Container build + Trivy scan
  7. E2E tests on preview environment (Playwright)
  8. Auto-deploy to staging on merge to develop
```

---

## 13. GDPR & Data Governance

### Personal Data Map

| Data Category | GDPR Classification | Processing Basis |
|---|---|---|
| Resident name, DOB, address | Personal data | Contract (care services) |
| NHS number, medical records | Special category (Art. 9) | Health/social care (Art. 9(2)(h)) |
| Mental health, dementia records | Special category | Health/social care + explicit consent |
| Staff records, payroll | Personal data | Contract (employment) |
| Family contact details | Personal data | Legitimate interest |
| CCTV footage | Personal data | Legitimate interest + safety |
| Biometric (wearable) data | Special category | Explicit consent |

### Data Subject Rights (Automated)

- **Right of Access (SAR)**: Self-service export for family portal users; staff-assisted for residents
- **Right to Erasure**: Workflow — legal hold check → anonymisation (care records cannot be deleted, only anonymised after retention period)
- **Right to Portability**: JSON export of resident record
- **Consent management**: Per-resident consent register, audit of consent granted/withdrawn

### Lawful Basis Documentation
- DPIA (Data Protection Impact Assessment) — completed before Phase 1 launch
- Record of Processing Activities (ROPA) — maintained in system
- Data Processing Agreements (DPAs) — with all sub-processors (AWS, Auth0, Datadog, etc.)

---

*Document version: 1.0*
*Last updated: March 2026*
*Next review: June 2026 (Phase 1 completion)*
