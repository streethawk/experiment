# CareCore SaaS — Project Roadmap
> UK Care Home Management Platform

---

## Vision

A fully compliant, cloud-native SaaS platform purpose-built for UK care homes — replacing
paper-based workflows, unifying operations, and enabling proactive care through data and AI.

## Strategic Goals

| Goal | Measure |
|---|---|
| CQC compliance confidence | Every home always inspection-ready |
| Replace paper MAR & care notes | Zero paper care records |
| Real-time safety & health monitoring | <60s alert latency for critical events |
| Group-level operational intelligence | Cross-home benchmarking dashboard |
| NHS ecosystem integration | GP Connect, Spine, EPS live |

---

## Phases Overview

```
Phase 1: Foundation        [Months 01-04]  MVP — one home using it daily
Phase 2: Operations        [Months 05-08]  Full operational suite
Phase 3: Compliance        [Months 09-12]  Regulatory & NHS integrations
Phase 4: Intelligence      [Months 13-18]  IoT, AI, predictive analytics
Phase 5: Platform          [Months 19-24]  Multi-group, marketplace, open API
```

---

## Phase 1 — Foundation (Months 1–4)

**Theme**: Get one real care home paperless on core workflows.

**Success Criteria**:
- 1 pilot home fully onboarded
- Daily care notes, MAR, incidents all digital
- Zero paper for resident records
- Basic invoicing generating real invoices

### Deliverables

#### 1.1 Infrastructure & Security Baseline
- [ ] AWS eu-west-2 (London) multi-AZ setup
- [ ] VPC, private subnets, security groups, WAF
- [ ] CI/CD pipeline (GitHub Actions → ECS Fargate)
- [ ] PostgreSQL RDS (encrypted, automated backups, PITR)
- [ ] S3 encrypted document storage with versioning
- [ ] Auth0 / AWS Cognito with MFA enforcement
- [ ] Audit log infrastructure (append-only, immutable)
- [ ] RBAC framework: Group Admin, Home Manager, Senior Carer, Carer, Family
- [ ] ICO registration completed
- [ ] GDPR DPIA completed for health data processing

#### 1.2 Resident Core
- [ ] Resident profile: demographics, NHS number, GP details, NOK
- [ ] Admission workflow: referral intake → needs assessment → admission
- [ ] Care plan creation (templated: residential, nursing, dementia, EMI)
- [ ] Care plan versioning (every change tracked, previous versions accessible)
- [ ] Allergy and diagnosis recording
- [ ] Document vault: upload, tag, version (LPA, DNAR, ID documents)
- [ ] Bed/room management: occupancy map per floor/wing

#### 1.3 Digital MAR (Medication Administration Record)
- [ ] Prescription management: add, amend, discontinue
- [ ] MAR chart: round-based administration (morning/lunch/evening/night)
- [ ] Administration recording: given / refused / not available / away
- [ ] Missed dose alerts (real-time to senior carer)
- [ ] PRN (as-required) medication recording
- [ ] Controlled drug register: running balance, witness signatures
- [ ] Medication error incident auto-linking
- [ ] MAR audit report (per resident, per period)

#### 1.4 Care Notes & Daily Logs
- [ ] Shift handover notes
- [ ] Daily care notes by category (personal care, nutrition, mobility, mood, sleep)
- [ ] Body map (pressure area recording, wound notation)
- [ ] Fluid balance and food intake charts
- [ ] Bowel and continence charts
- [ ] Weight recording and trending

#### 1.5 Incident Reporting
- [ ] Incident types: fall, medication error, safeguarding, near-miss, complaint, infection
- [ ] Structured capture: what happened, witnesses, immediate actions, injuries
- [ ] Post-incident: root cause, contributing factors, lessons learned
- [ ] CQC s31 notifiable incident flagging with submission checklist
- [ ] Incident trend dashboard (type, location, time, resident, staff)

#### 1.6 Finance — Billing Core
- [ ] Resident fee setup: room rate, care level uplift, extras
- [ ] Funding source: self-funded, local authority, NHS FNC, CHC
- [ ] Monthly invoice generation (PDF, email)
- [ ] Payment recording and outstanding balance tracking
- [ ] Simple arrears report

#### 1.7 Basic Web App
- [ ] Responsive web app (Next.js) — desktop for managers, tablet for carers
- [ ] Role-appropriate dashboards on login
- [ ] Global search (resident by name/room/NHS number)
- [ ] Notification centre (alerts, tasks due, incidents open)

---

## Phase 2 — Operations (Months 5–8)

**Theme**: Full operational suite — staffing, compliance, family communication.

**Success Criteria**:
- 5+ homes onboarded
- Rota management replacing spreadsheets
- Family portal live with active daily use
- CQC compliance dashboard showing real data

### Deliverables

#### 2.1 Staff & Rota Management
- [ ] Staff profiles: role, contact, employment details, right-to-work
- [ ] DBS check records: type, issue date, update service tracking, expiry alerts
- [ ] Mandatory training matrix: manual handling, safeguarding, fire, first aid, dementia, COSHH
- [ ] Rota builder: weekly/fortnightly view, shift pattern templates
- [ ] Skill-mix enforcement: minimum qualified nurse per shift if nursing home
- [ ] Staff-to-resident ratio calculator with real-time alerts
- [ ] Attendance: clock-in/out (PIN or QR code), timesheet generation
- [ ] Agency staff booking and tracking (with rate recording)
- [ ] Sickness/absence: Bradford Factor scoring, return-to-work
- [ ] Supervision and appraisal scheduling and recording
- [ ] Payroll export (CSV for Sage/BrightHR)

#### 2.2 Task Management & Care Delivery
- [ ] Care task lists generated from care plans (per shift, per resident)
- [ ] Task completion recording (staff, time, notes)
- [ ] Overdue task escalation alerts
- [ ] Activities programme: weekly planner, resident participation recording
- [ ] 1:1 activity logs (links to CQC "Responsive" domain)
- [ ] Visiting schedule management

#### 2.3 Health Monitoring
- [ ] Manual vitals recording: BP, pulse, O2 sat, temperature, blood sugar, weight
- [ ] Baseline and target ranges per resident (alerts on deviation)
- [ ] Wound care module: wound type, site, photo, tissue classification, PUSH score, dressing plan
- [ ] MUST (Malnutrition Universal Screening Tool) score
- [ ] Waterlow pressure ulcer risk score
- [ ] Falls risk assessment (multi-factor)
- [ ] Cognitive assessments: MMSE, Clifton Assessment, ABCs of dementia behaviour

#### 2.4 Compliance & CQC Dashboard
- [ ] CQC 5 Key Questions framework: Safe / Effective / Caring / Responsive / Well-Led
- [ ] Compliance evidence linking: policies, audits, training records
- [ ] Audit builder: medication audit, care plan audit, environment audit, H&S audit
- [ ] Policy document library with version control and acknowledgement tracking
- [ ] Fire drill log, equipment service records, contractor visits
- [ ] Safeguarding workflow: raise concern → LA referral → LADO involvement → outcome
- [ ] DoLS tracker: application submitted, outcome, renewal date, expiry alert
- [ ] Mental Capacity Act assessment forms (per decision type)
- [ ] GDPR access log: who viewed what, export requests, Subject Access Requests

#### 2.5 Family & Resident Portal
- [ ] Resident profile page for family: photo, room, keyworker
- [ ] Daily updates feed: meals, mood, activities (carer-published)
- [ ] Secure messaging: family ↔ home manager / keyworker
- [ ] Document sharing: care plans, invoices, correspondence
- [ ] Visit booking: in-person and virtual (video call integration)
- [ ] Notification preferences: daily summary, incident alerts, appointment reminders
- [ ] Family onboarding: invite by email, verify identity, link to resident record

#### 2.6 Inventory Management
- [ ] Item catalogue: PPE, clinical consumables, medications stock, food, cleaning
- [ ] Stock level tracking: quantity on hand, par level, reorder point
- [ ] Low-stock alerts (automated, configurable threshold)
- [ ] Supplier directory and preferred vendor management
- [ ] Purchase order generation (manual and auto-triggered)
- [ ] Goods received recording and reconciliation
- [ ] Usage analytics: consumption rate by category, cost per resident per month

---

## Phase 3 — Compliance & Integrations (Months 9–12)

**Theme**: NHS ecosystem integration, regulatory depth, multi-home groups.

**Success Criteria**:
- NHS GP Connect live in at least one pilot home
- CHC funding workflow operational
- Group management dashboard live for 2+ home groups
- DTAC assessment completed

### Deliverables

#### 3.1 NHS Integrations
- [ ] **NHS Spine / PDS**: verify NHS numbers, retrieve demographic data at admission
- [ ] **GP Connect**: read GP record (medications, allergies, conditions) at admission
- [ ] **SCR (Summary Care Record)**: view at point of care for clinical staff
- [ ] **EPS (Electronic Prescription Service)**: link prescriptions to dispensing pharmacy
- [ ] **Hospital discharge coordination**: structured import of discharge summaries
- [ ] DTAC (Digital Technology Assessment Criteria) assessment completed
- [ ] DSP (Data Security & Protection) Toolkit submission

#### 3.2 Funding & Finance Advanced
- [ ] **CHC (Continuing Healthcare)** pathway: screening checklist → DST → full assessment → outcome
- [ ] **CHC Fast Track** pathway (end of life)
- [ ] **NHS Funded Nursing Care (FNC)** band recording and invoice inclusion
- [ ] **Deferred Payment Agreement** administration
- [ ] **Top-up fee** agreements: third-party payer, amount, review dates
- [ ] **Local authority remittance reconciliation**: import LA payment schedules, match to invoices
- [ ] **Fee increase workflow**: notice period tracking, resident/family notification, contract amendment
- [ ] Integration: Xero, QuickBooks (GL codes, invoice sync, payment reconciliation)

#### 3.3 Pharmacy Integration
- [ ] Integration with major pharmacy systems (Pharmex, RxWeb, Lloyds PharmacyManager)
- [ ] Medication order transmission to dispensing pharmacy
- [ ] Dispensed vs prescribed reconciliation
- [ ] Blister pack / MDS (Monitored Dosage System) support
- [ ] Medication return and disposal recording

#### 3.4 Multi-Home Group Management
- [ ] Group-level admin portal
- [ ] Cross-home occupancy dashboard
- [ ] Group-wide HR: centralised DBS, training matrix, staff transfer tracking
- [ ] Consolidated group finance: P&L per home, group roll-up
- [ ] Benchmarking: incident rates, CQC metrics, staff ratios across homes
- [ ] Group-wide policy distribution and acknowledgement
- [ ] Registered Manager notifications to CQC (centrally managed)

#### 3.5 Infection Control Module
- [ ] Outbreak declaration workflow (norovirus, COVID, flu, scabies, MRSA)
- [ ] Isolation assignments and cohort nursing records
- [ ] PPH (Public Health) escalation checklist
- [ ] Infection surveillance: symptom tracking, spread mapping
- [ ] Antibiotic prescribing log (linked to outbreak records)
- [ ] Post-outbreak debrief and lessons learned

#### 3.6 End-of-Life Care Module
- [ ] Gold Standards Framework alignment
- [ ] Preferred place of care / death recording
- [ ] Advance care plan (ACP) document management
- [ ] ReSPECT form digital completion
- [ ] Comfort care task lists
- [ ] Bereavement follow-up for family (scheduled outreach)
- [ ] Death notification workflow (GP, coroner if required, CQC if reportable)

---

## Phase 4 — Intelligence (Months 13–18)

**Theme**: IoT integration, predictive risk, AI-assisted care.

**Success Criteria**:
- IoT devices live in 3+ homes
- Predictive fall risk model in active use
- AI care plan suggestions adopted by >50% of care plan authors
- Analytics dashboards used weekly by home managers

### Deliverables

#### 4.1 IoT Integration Layer
- [ ] AWS IoT Core broker setup
- [ ] **Fall detectors**: Tunstall, Tynetec, Aidcall — real-time alert to care staff mobile
- [ ] **Wearables**: continuous heart rate, O2 sat, skin temp, movement (Fitbit Health Solutions, Withings)
- [ ] **BP monitors**: automated reading ingestion (Omron, A&D)
- [ ] **Smart beds / chair sensors**: in/out of bed, prolonged sitting alerts
- [ ] **Call bell system integration**: Courtney Thorne, Aidcall — response time tracking
- [ ] **Door / access control**: visitor entry log, restricted area alerts (dementia wandering)
- [ ] **Medication dispensers**: Pivotell, Medido — dispensing confirmation
- [ ] IoT data dashboard: per-device status, battery, last-seen
- [ ] Configurable alert routing: fall → nearest carer mobile + nurse station

#### 4.2 Predictive Analytics & AI
- [ ] **Fall risk prediction model**: uses vitals trends, medication side effects, mobility records, prior falls
- [ ] **Infection outbreak early warning**: fever clustering, diarrhoea/vomiting pattern detection
- [ ] **Staffing shortage predictor**: rota analysis, historical absence patterns, demand forecasting
- [ ] **Medication adherence tracking**: refusal trends, timing drift, side-effect correlation
- [ ] **Occupancy forecasting**: discharge likelihood, length of stay modelling, referral pipeline
- [ ] **Pressure ulcer risk trajectory**: Waterlow trend + mobility data + nutrition
- [ ] **AI care plan assistant**: suggest care plan sections based on assessment inputs
- [ ] **Anomaly detection**: unusual weight loss, sleep disruption, withdrawal from activities

#### 4.3 Advanced Reporting & BI
- [ ] Custom report builder (drag-and-drop fields, filters, date ranges)
- [ ] Scheduled report delivery (email PDF/CSV)
- [ ] Power BI / Tableau connector (live data via API or data warehouse export)
- [ ] Regulatory report templates: CQC inspection evidence pack, LA annual review
- [ ] Staff hours and agency spend analysis
- [ ] Care quality metrics: task completion rates, incident frequency, response times
- [ ] Resident outcome metrics: weight, mood, mobility, social engagement trends

#### 4.4 Mobile App (Care Staff)
- [ ] React Native app (iOS + Android)
- [ ] Offline-first: queue actions when WiFi poor, sync on reconnect
- [ ] Push notifications: task alerts, IoT alarms, incident escalations
- [ ] Quick care note entry (voice-to-text)
- [ ] MAR administration recording
- [ ] Photo capture (wounds, body map, activities)
- [ ] Shift handover on mobile
- [ ] Resident photo ID on room view

---

## Phase 5 — Platform (Months 19–24)

**Theme**: Scale to large groups, open ecosystem, market leadership.

### Deliverables

#### 5.1 Enterprise & Large Group Features
- [ ] White-labelling for large care groups
- [ ] Enterprise SSO (SAML 2.0 / OIDC) for corporate IT integration
- [ ] Advanced tenant isolation and data segregation options
- [ ] SLA-backed uptime (99.9%) with dedicated support
- [ ] Custom integration development programme

#### 5.2 Open API & Marketplace
- [ ] Public REST API with API keys and OAuth2
- [ ] Developer portal: documentation, sandbox environment, rate limits
- [ ] Webhook system for outbound events (incident created, resident admitted, etc.)
- [ ] Partner marketplace: approved integrations listed (pharmacy, payroll, activity providers)
- [ ] Supplier portal: vendors can submit invoices directly into inventory module

#### 5.3 Regulatory Evolution
- [ ] Integrated Care System (ICS) reporting for local NHS bodies
- [ ] Adult Social Care Outcomes Framework (ASCOF) data submission
- [ ] Automatic CQC registration renewal reminders and document pack
- [ ] Wales (CIW), Scotland (Care Inspectorate), NI (RQIA) compliance variants

#### 5.4 AI Platform Maturity
- [ ] LLM-assisted incident narrative writing (structured data → natural language reports)
- [ ] Automated CQC evidence pack generation pre-inspection
- [ ] Personalised resident activity recommendations (preferences + engagement data)
- [ ] Medication interaction checker (at prescription entry)
- [ ] Automated family update narratives (daily AI-written summaries from care data)

---

## Cross-Cutting Concerns (All Phases)

### Security & Compliance (Continuous)
| Milestone | Target Phase |
|---|---|
| ICO registration | Phase 1 |
| GDPR DPIA completed | Phase 1 |
| Cyber Essentials | Phase 1 |
| Penetration test (external) | Phase 2 |
| Cyber Essentials Plus | Phase 2 |
| DTAC assessment | Phase 3 |
| DSP Toolkit | Phase 3 |
| ISO 27001 gap analysis | Phase 3 |
| ISO 27001 certification | Phase 4 |

### Performance Targets
| Metric | Target |
|---|---|
| API p99 response time | < 500ms |
| MAR chart load | < 2s |
| IoT alert latency | < 60s end-to-end |
| Mobile offline sync | < 10s on reconnect |
| Uptime SLA | 99.9% (Phase 1), 99.95% (Phase 5) |
| RTO (Recovery Time Objective) | < 4 hours |
| RPO (Recovery Point Objective) | < 1 hour |

### Accessibility (Continuous)
- WCAG 2.1 AA — care home staff include older workers, varying digital literacy
- Large-text mode for residents/family on portal
- Screen reader compatibility throughout
- High-contrast mode

---

## Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| NHS integration delays (GP Connect accreditation) | High | Medium | Build around it; add value without it first |
| CQC regulatory changes | Medium | High | Regulatory advisory board; modular compliance engine |
| Data breach (special category health data) | Low | Critical | ISO 27001, pen testing, break-glass audit, cyber insurance |
| Low digital literacy in care staff | High | High | UX testing with real carers, training programme, champion model |
| Care home IT infrastructure poor (WiFi) | High | Medium | Offline-first mobile app, graceful degradation |
| Competitor response (Person Centred Software, Nourish) | Medium | Medium | Focus on CQC intelligence + AI differentiation |
| CHC/LA funding complexity causes finance errors | Medium | High | Legal review of billing rules, audit trails, reconciliation tools |

---

## Competitors to Track

| Product | Strength | Gap We Exploit |
|---|---|---|
| Person Centred Software (PCF) | Care notes, MAR | Weak on finance, no predictive AI |
| Nourish Care | UX, care planning | No IoT, limited finance |
| Oomph! Wellness | Activities | Narrow scope |
| Access Care Planning | HR integration | Poor mobile UX |
| Carebeans | Finance | Weak on care delivery |
| **CareCore (us)** | End-to-end, AI, IoT, NHS | — |

---

*Document version: 1.0 — Phase 1 Planning*
*Last updated: March 2026*
