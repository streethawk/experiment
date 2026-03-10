# CareCore SaaS — UI/UX Wireframes
> Key screen layouts for web (managers) and mobile (care staff)

---

## Design Principles

- **Mobile-first for carers** — they are on the floor, not at desks
- **Desktop-first for managers** — dashboards, rotas, finance, compliance
- **Large touch targets** — many staff use tablets with gloves or older workers with large fingers
- **Minimal cognitive load** — carers are busy; critical actions in <2 taps
- **High contrast** — readable in bright room lighting or dim night shifts
- **Offline indicator** — always visible when device is offline

---

## Colour System & Design Tokens

```
Primary:        #1E40AF  (deep blue)       — navigation, CTAs
Success:        #15803D  (green)           — completed, safe, administered
Warning:        #B45309  (amber)           — due soon, low stock, alerts
Danger:         #B91C1C  (red)             — overdue, critical, incidents
Neutral:        #374151  (dark grey)       — body text
Surface:        #F9FAFB  (off-white)       — page background
Card:           #FFFFFF                   — card surfaces
Border:         #E5E7EB                   — dividers

Status badges:
  Active resident     — green dot
  Hospital (absent)   — amber dot
  Discharged          — grey dot
  Deceased            — grey (no dot)

Shift colours:
  Early  07:00-14:00  — #DBEAFE  (light blue)
  Late   14:00-21:00  — #FEF3C7  (light amber)
  Night  21:00-07:00  — #EDE9FE  (light purple)
```

---

## Screen Index

1.  Login
2.  Home Manager Dashboard
3.  Carer Dashboard (Mobile)
4.  Resident List
5.  Resident Profile
6.  Care Plan
7.  MAR Chart (Medication Administration Record)
8.  Daily Care Notes
9.  Incident Report
10. Rota & Shift Scheduler
11. Staff Profile
12. Finance Dashboard
13. Invoice Detail
14. CQC Compliance Dashboard
15. Family Portal — Home
16. Inventory Dashboard

---

## 1. Login Screen

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [CareCore Logo]                      │
│                  UK Care Home Platform                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Email address                                  │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ name@carehome.co.uk                       │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │                                                 │   │
│  │  Password                                       │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ ••••••••••••••                        👁  │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │                                                 │   │
│  │  [  Sign In  ]              Forgot password?   │   │
│  │                                                 │   │
│  │  ─────────────── or ──────────────────          │   │
│  │                                                 │   │
│  │  [  Sign in with NHS CIS2  ]                   │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🔐 Two-factor authentication required          │   │
│  │  Enter the 6-digit code from your authenticator │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │  [ _ ] [ _ ] [ _ ]  [ _ ] [ _ ] [ _ ]    │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │  Trust this device for 30 days  ☐               │   │
│  │  [  Verify  ]                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ICO Reg: ZA123456  |  GDPR compliant  |  v2.1.0       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Home Manager Dashboard (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  [≡] CareCore          Oakwood House, Bristol          🔔 3   👤 Jane Smith  [logout] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──── Navigation (left sidebar) ────┐                                               │
│  │ 🏠 Dashboard          ← active   │  ┌─── Occupancy ─────┐ ┌─── Staffing ──────┐  │
│  │ 👥 Residents                     │  │  42 / 48 beds     │ │  18 / 20 required │  │
│  │ 💊 Medications (MAR)             │  │  87.5% occupancy  │ │  ⚠ 2 gaps today   │  │
│  │ 📋 Care Plans                    │  │  ████████████░░   │ │  Early  ✓  8/8    │  │
│  │ 🚨 Incidents          [3]        │  │                   │ │  Late   ⚠  6/8    │  │
│  │ 🗓  Rota                         │  │  2 awaiting admit │ │  Night  ✓  4/4    │  │
│  │ 📦 Inventory                     │  │  1 on hospital    │ │                   │  │
│  │ 💷 Finance                       │  └───────────────────┘ └───────────────────┘  │
│  │ ✅ Compliance                    │                                               │
│  │ 📊 Reports                       │  ┌─── Today's Alerts ─────────────────────┐  │
│  │ 👨‍👩‍👧 Family Portal                │  │ 🔴 MAR: 3 medications overdue         │  │
│  │ ⚙  Settings                     │  │ 🟡 Incident: 1 new fall report pending │  │
│  │                                  │  │ 🟡 Rota: Late shift has 2 gaps        │  │
│  │ ──────────────────────────────   │  │ 🟢 CQC: All audits up to date         │  │
│  │ 🏢 Switch Home ▾                 │  │ 🟡 Inventory: PPE gloves low stock    │  │
│  │   Oakwood House   ← current     │  │ 🔴 DoLS: 2 reviews due this week      │  │
│  │   Maple Lodge                   │  └────────────────────────────────────────┘  │
│  │   Cedar Court                   │                                               │
│  └──────────────────────────────────┘  ┌─── Resident Wellbeing (last 7 days) ───┐  │
│                                        │                              Avg mood    │  │
│                                        │  😊 Happy      ████████████  3.8/5     │  │
│                                        │  🍽  Nutrition  ████████░░░░  78% good  │  │
│                                        │  🚶 Activity   ██████░░░░░░  62% part  │  │
│                                        │  💊 MAR        ████████████  96% adm'd │  │
│                                        └────────────────────────────────────────┘  │
│                                                                                      │
│  ┌─── Recent Incidents (last 48h) ────────────────┐  ┌─── Upcoming Tasks ────────┐  │
│  │ 🔴 Fall  — Rm 14 — E. Thompson  2h ago  [View]│  │ 14:00  Medication round   │  │
│  │ 🟡 Near miss — Kitchen  — 8h ago        [View]│  │ 15:00  Fire drill check   │  │
│  │ 🟡 Complaint — Family  — Yesterday      [View]│  │ 16:00  GP visit — Rm 8    │  │
│  └────────────────────────────────────────────────┘  │ 17:00  Weight recording   │  │
│                                                       └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Carer Dashboard (Mobile — Primary View)

```
┌────────────────────────────┐
│ ≡  CareCore    🔔2    👤   │
│ Oakwood House — Early shift│
├────────────────────────────┤
│                            │
│  Good morning, Sarah 👋    │
│  Early shift  07:00–14:00  │
│  You have 12 residents     │
│                            │
├────────────────────────────┤
│  ⚠ ACTION NEEDED           │
├────────────────────────────┤
│ 🔴 MAR due — 3 residents   │
│     Tap to view ›          │
│                            │
│ 🟡 4 care tasks overdue    │
│     Tap to view ›          │
├────────────────────────────┤
│  YOUR RESIDENTS (Wing A)   │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ 🟢  Rm 101  E. Thompson│ │
│ │     3 tasks remaining  │ │
│ │     Last note: 06:45   │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ 🟡  Rm 102  M. Patel   │ │
│ │     MAR due 08:00 ⚠    │ │
│ │     Last note: 06:30   │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ 🟢  Rm 103  D. Wilson  │ │
│ │     All tasks done ✓   │ │
│ │     Last note: 07:15   │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ 🔴  Rm 104  H. Okafor  │ │
│ │     Fall risk HIGH     │ │
│ │     Check-in overdue   │ │
│ └────────────────────────┘ │
│         [Load more...]     │
├────────────────────────────┤
│ ──────── Quick Log ──────  │
│  [📝 Care Note] [💊 MAR]   │
│  [🚨 Incident] [✅ Task]   │
├────────────────────────────┤
│ 🏠    👥    💊    📋    👤 │
│Home Residents MAR Plans Me │
└────────────────────────────┘
```

---

## 4. Resident List (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Residents                                        [+ Add Resident]  [Export] │
├──────────────────────────────────────────────────────────────────────────────┤
│  🔍 Search by name, room, NHS number...        Filter: All ▾  Sort: Room ▾  │
├──────────────────────────────────────────────────────────────────────────────┤
│  Tabs: [All (42)] [Active (40)] [Hospital (1)] [Respite (1)] [Discharged]   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──┬────────────────────┬──────┬───────────────┬──────────┬──────────────┐ │
│  │  │ Name               │ Room │ Care Type     │ Key Risk │ Status       │ │
│  ├──┼────────────────────┼──────┼───────────────┼──────────┼──────────────┤ │
│  │👤│ Thompson, Edith    │  101 │ Residential   │ 🟡 Falls  │ 🟢 Active   │ │
│  │  │ DOB: 12/03/1938    │  W-A │ Self-funded   │          │ Day 142      │ │
│  ├──┼────────────────────┼──────┼───────────────┼──────────┼──────────────┤ │
│  │👤│ Patel, Meena       │  102 │ Nursing       │ 🔴 Pressure│ 🟢 Active  │ │
│  │  │ DOB: 08/07/1941    │  W-A │ Local Auth.   │ sores    │ Day 89       │ │
│  ├──┼────────────────────┼──────┼───────────────┼──────────┼──────────────┤ │
│  │👤│ Wilson, Derek      │  103 │ Dementia/EMI  │ 🟡 Wander │ 🟢 Active  │ │
│  │  │ DOB: 22/11/1935    │  W-A │ CHC funded    │          │ Day 318      │ │
│  ├──┼────────────────────┼──────┼───────────────┼──────────┼──────────────┤ │
│  │👤│ Okafor, Helen      │  104 │ Nursing       │ 🔴 High   │ 🟠 Hospital │ │
│  │  │ DOB: 30/01/1945    │  W-A │ NHS FNC+LA    │ falls    │ Since 08/03  │ │
│  ├──┼────────────────────┼──────┼───────────────┼──────────┼──────────────┤ │
│  │👤│ Singh, Gurpreet    │  105 │ Residential   │ 🟢 Low    │ 🟢 Active   │ │
│  │  │ DOB: 14/06/1943    │  W-A │ Self-funded   │          │ Day 27       │ │
│  └──┴────────────────────┴──────┴───────────────┴──────────┴──────────────┘ │
│                                                                              │
│  Showing 1–20 of 42   [← Prev]  1  2  3  [Next →]                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Resident Profile (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Residents                                                             │
│                                                                                  │
│  ┌─── Profile Header ────────────────────────────────────────────────────────┐  │
│  │  [Photo]  Edith Thompson                                      🟢 Active   │  │
│  │  [  E  ]  DOB: 12 March 1938 (87 years)  |  Room 101, Wing A             │  │
│  │           NHS: 943 476 5281              |  Admitted: 19 Oct 2024 (142d)  │  │
│  │           GP: Dr A. Mehta, Clifton       |  Keyworker: Sarah Jones        │  │
│  │           Funding: Self-funded  £1,450/wk|  Care type: Residential        │  │
│  │  [Edit Profile]  [Print Summary]  [Share with GP]  [⚠ Risk Flags: 2]     │  │
│  └─────────────────────────────────────────────────────────────────────────── ┘  │
│                                                                                  │
│  ┌─── Tab Navigation ──────────────────────────────────────────────────────┐    │
│  │ [Overview] [Care Plan] [MAR] [Care Notes] [Health] [Incidents]          │    │
│  │ [Documents] [Finance] [Family] [Compliance]                             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ─── OVERVIEW TAB ──────────────────────────────────────────────────────────    │
│                                                                                  │
│  ┌── Key Info ──────────────────────┐  ┌── Risk Assessments ─────────────────┐ │
│  │ Diagnosis: Vascular Dementia     │  │ Falls Risk    🟡 MEDIUM   Score: 12  │ │
│  │            Hypertension          │  │               Reviewed: 01/03/2026  │ │
│  │ Allergies: 🔴 Penicillin         │  │ Waterlow      🟢 LOW      Score: 8   │ │
│  │            🟡 Aspirin (caution)  │  │               Reviewed: 28/02/2026  │ │
│  │ DNAR: ✓ In place (04/01/2026)   │  │ MUST          🟢 LOW      Score: 0   │ │
│  │ DoLS: ✓ Active, exp 30/09/2026  │  │               Reviewed: 15/02/2026  │ │
│  │ LPA: ✓ Welfare — J. Thompson    │  │ Cognitive     MMSE: 14/30 (Mod)     │ │
│  │          Finance — J. Thompson  │  │               Reviewed: 10/01/2026  │ │
│  └──────────────────────────────────┘  └─────────────────────────────────────┘ │
│                                                                                  │
│  ┌── Recent Care Notes (last 3) ──────────────────────────────────────────────┐ │
│  │ 10/03 07:15  Sarah J. (Carer)  Personal care — Assisted with wash & dress. │ │
│  │              Good mood, ate 75% breakfast. Slight cough noted.             │ │
│  │ 09/03 21:30  Tom R. (Night)    Settled well. Woke once at 02:00, resettled │ │
│  │              after reassurance. No concerns.                               │ │
│  │ 09/03 14:00  Nurse B. (RN)     BP 138/84 — within target range. Weight     │ │
│  │              stable at 58kg. Medication administered without issue.        │ │
│  │                                                        [View all notes →]  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌── Vitals Trend (last 30 days) ─────────────────────────────────────────────┐ │
│  │  Blood Pressure                                                             │ │
│  │  160 ┤                                                                     │ │
│  │  150 ┤  •   •                                                              │ │
│  │  140 ┤    •   • •   • • •   •   • •                                       │ │
│  │  130 ┤              •   • •   • •   •                                      │ │
│  │  120 ┼──────────────────────────────────── 10 Feb → 10 Mar               │ │
│  │       Weight: 58.0kg ▼0.3kg   O2 Sat: 97%  Pulse: 74bpm                  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Care Plan (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Edith Thompson — Care Plan  v3   Last updated: 05/03/2026 by Nurse B. Adeyemi  │
│  Status: 🟢 Current   Next review due: 05/06/2026   [Edit] [Print] [History]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Sections:  [Personal] [Communication] [Mobility] [Nutrition] [Continence]      │
│             [Personal Care] [Sleep] [Medication] [Social] [End of Life]          │
│                                                                                  │
│  ─── MOBILITY ───────────────────────────────────────────────────────────────── │
│                                                                                  │
│  What Edith can do for herself:                                                  │
│  Edith can walk short distances with her Zimmer frame. She is able to transfer   │
│  from chair to bed with standby assistance from one carer.                       │
│                                                                                  │
│  What support Edith needs:                                                       │
│  • Prompt and encouragement to use her Zimmer frame at all times                 │
│  • Standby assistance for all transfers                                          │
│  • Non-slip socks must be worn at all times                                     │
│  • Handrail on right side when using stairs (avoided where possible)            │
│                                                                                  │
│  Preferred approach:                                                             │
│  Edith prefers a female carer for personal care. She becomes anxious if rushed.  │
│  Always explain what you are going to do before you do it.                      │
│                                                                                  │
│  Risk: 🟡 Falls Risk — MEDIUM (score 12)                                        │
│  Repositioning: Every 2 hours when in chair (chair sensor active)               │
│                                                                                  │
│  Equipment: Zimmer frame (serial: ZF-0234), bed rails (both sides), mattress    │
│             overlay — Nimbus 3 (checked 01/03/2026, next check 01/04/2026)     │
│                                                                                  │
│  ──────────────────────────────────────────────────────── [← Nutrition] [Social →] │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. MAR Chart — Medication Administration Record (Desktop + Mobile)

### Desktop View
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  MAR Chart — Edith Thompson (Rm 101)           March 2026   [← Feb] [Apr →]     │
│  ⚠ ALLERGY: Penicillin  |  Reviewed by: Nurse B. Adeyemi  |  [Print MAR]       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Medication          │Dose│Route│ 01│ 02│ 03│ 04│ 05│...│ 10│ 11│ ...│ 31  │   │
│                      │    │     │   │   │   │   │   │   │   │   │    │     │   │
│  ─── 08:00 ROUND ──────────────────────────────────────────────────────────     │
│  Amlodipine 5mg      │ 1  │ PO  │ ✓ │ ✓ │ ✓ │ ✓ │ ✓ │...│ ✓ │ ⬜ │    │     │  │
│  Atorvastatin 20mg   │ 1  │ PO  │ ✓ │ ✓ │ ✓ │ ✓ │ R │...│ ✓ │ ⬜ │    │     │  │
│  Lansoprazole 15mg   │ 1  │ PO  │ ✓ │ ✓ │ ✓ │ N │ ✓ │...│ ✓ │ ⬜ │    │     │  │
│                                                                                  │
│  ─── 12:00 ROUND ──────────────────────────────────────────────────────────     │
│  Metformin 500mg     │ 1  │ PO  │ ✓ │ ✓ │ ✓ │ ✓ │ ✓ │...│ ✓ │ ⬜ │    │     │  │
│                                                                                  │
│  ─── 18:00 ROUND ──────────────────────────────────────────────────────────     │
│  Amlodipine 5mg      │ 1  │ PO  │ ✓ │ ✓ │ ✓ │ ✓ │ ✓ │...│ 🔴│ ⬜ │    │     │  │
│  Metformin 500mg     │ 1  │ PO  │ ✓ │ ✓ │ ✓ │ ✓ │ ✓ │...│ ✓ │ ⬜ │    │     │  │
│                                                                                  │
│  ─── PRN (As Required) ─────────────────────────────────────────────────────    │
│  Paracetamol 500mg   │1-2 │ PO  │max 4g/day — pain / temp >37.5               │  │
│  Uses this month: 4  │  Last: 08/03 14:20 — Nurse B. — pain 5/10, right hip   │  │
│                                                                                  │
│  ─── CONTROLLED DRUGS ──────────────────────────────────────────────────────    │
│  Codeine Phos 30mg   │ 1  │ PO  │ ✓ │ ✓ │ ✓ │ ✓ │ ✓ │...│ ✓ │ ⬜ │    │     │  │
│  Witness required    │    │     │ TJ│ TJ│ TJ│ TJ│ SR│...│ BA│    │    │     │  │
│                                                                                  │
│  KEY: ✓ Given  R Refused  N Not available  A Away  ⬜ Not yet due  🔴 Overdue  │
│       PO = Oral  SC = SubCut  TD = Transdermal                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [+ Add Medication]  [Medication Error Report]  [Order Repeat Prescription]     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Mobile MAR Administration (Carer View)
```
┌────────────────────────────┐
│ ← MAR  Edith Thompson      │
│ Room 101  |  08:00 Round   │
│ ⚠ ALLERGY: Penicillin      │
├────────────────────────────┤
│  Amlodipine 5mg            │
│  1 tablet  •  Oral         │
│  Stock: 18 remaining       │
│                            │
│  ┌────────┬────────┬─────┐ │
│  │ ✓ GIVE │ REFUSE │ N/A │ │
│  └────────┴────────┴─────┘ │
│                            │
│  Administered by: Sarah J  │
│  Time: 08:14  ✓ auto       │
│  [Add note (optional)]     │
├────────────────────────────┤
│  Atorvastatin 20mg         │
│  1 tablet  •  Oral         │
│  Stock: 22 remaining       │
│                            │
│  ┌────────┬────────┬─────┐ │
│  │ ✓ GIVE │ REFUSE │ N/A │ │
│  └────────┴────────┴─────┘ │
├────────────────────────────┤
│  2 of 3 recorded           │
│  ████████████░░░░ 67%      │
│                            │
│  [Sign off round]          │
└────────────────────────────┘
```

---

## 8. Daily Care Notes (Mobile + Desktop)

### Mobile — Quick Care Note Entry
```
┌────────────────────────────┐
│ ← New Care Note            │
│ Edith Thompson  •  Rm 101  │
├────────────────────────────┤
│  Category                  │
│  ┌──────────────────────┐  │
│  │ Personal Care      ▾ │  │
│  └──────────────────────┘  │
│  Also applies to:          │
│  [Nutrition] [Mood] [Sleep]│
│  [Mobility] [Medical]      │
│                            │
│  Note                      │
│  ┌──────────────────────┐  │
│  │                      │  │
│  │  Assisted Edith with │  │
│  │  morning wash and    │  │
│  │  dress. Good mood,   │  │
│  │  chatty. Ate 75%     │  │
│  │  of breakfast...     │  │
│  │                   🎤 │  │
│  └──────────────────────┘  │
│  [🎤 Dictate note]         │
│                            │
│  Mood  😞 😐 🙂 😊 😄      │
│        1  2  3  ④  5       │
│                            │
│  Add photo?  [📷 Camera]   │
│                            │
│  [  Save Note  ]           │
└────────────────────────────┘
```

### Desktop — Care Notes Timeline
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Care Notes — Edith Thompson              Filter: All ▾  [+ New Note]        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  10 March 2026 ─────────────────────────────────────────────────────────── │
│                                                                              │
│  07:15  Personal Care  😊  Sarah Jones (Carer)                               │
│  ├ Assisted with wash and dress. Good mood, very chatty this morning. Ate   │
│  │ 75% of breakfast (porridge and toast). Slight cough noted — no temp.     │
│  └ Mood: 4/5                                                    [Edit]       │
│                                                                              │
│  08:14  Medication  Sarah Jones (Carer)                                      │
│  ├ Morning medications administered. All 3 medications taken without issue.  │
│  └ No refusals.                                                [Edit]        │
│                                                                              │
│  09 March 2026 ─────────────────────────────────────────────────────────── │
│                                                                              │
│  21:30  Night Check  😐  Tom Rahman (Night Carer)                            │
│  ├ Settled well at 21:00. Woke at approximately 02:00 — appeared confused,  │
│  │ reassured and resettled within 10 minutes. No further disturbance.       │
│  └ Mood: 3/5  |  Fluid intake: 1,100ml  |  Output: recorded               │
│                                                                 [Edit]       │
│                                                                              │
│  14:00  Clinical  🩺  Nurse B. Adeyemi (RN)                                  │
│  ├ Routine vitals check. BP 138/84 (within target). Weight stable 58.0kg.  │
│  │ Evening medications administered without issue. Codeine witness: T.R.   │
│  └ [📷 Wound photo attached — right heel check, improving]     [Edit]       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Incident Report

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  New Incident Report                                    Step 1 of 3: Details     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Incident Type *                                                                 │
│  ┌───┐ ┌─────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐   │
│  │🚶 │ │💊       │ │🛡         │ │🤒           │ │⚠        │ │📢       │   │
│  │Fall│ │Med Error│ │Safeguard. │ │ Injury      │ │Near Miss │ │Complaint│   │
│  └───┘ └─────────┘ └───────────┘ └──────────────┘ └──────────┘ └──────────┘   │
│  ← selected: Fall                                                               │
│                                                                                  │
│  Resident Involved *                                                             │
│  ┌─────────────────────────────────────────────────┐                            │
│  │ Edith Thompson — Room 101                      ▾│                            │
│  └─────────────────────────────────────────────────┘                            │
│                                                                                  │
│  Date & Time *              Location *                                          │
│  ┌─────────────────────┐   ┌─────────────────────────────┐                     │
│  │ 10/03/2026  14:23   │   │ Bedroom — Room 101          ▾│                     │
│  └─────────────────────┘   └─────────────────────────────┘                     │
│                                                                                  │
│  What happened? (describe in detail) *                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐     │
│  │  Edith was found on the floor next to her bed by Sarah Jones at 14:23.│     │
│  │  She had been attempting to stand without using her Zimmer frame.     │     │
│  │  She stated she was trying to reach her cardigan on the chair.        │     │
│  │                                                                        │     │
│  └────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
│  Witnesses                                  Immediate actions taken             │
│  ┌──────────────────────────────────┐       ☑ Called for assistance             │
│  │ + Add witness                    │       ☑ Resident assessed on floor        │
│  │   Sarah Jones (reporting)        │       ☑ Not moved until assessed          │
│  │   Tom Rahman (assisted)          │       ☑ GP/nurse notified                 │
│  └──────────────────────────────────┘       ☐ 999 called                        │
│                                             ☑ Family/NOK notified              │
│                                             ☐ CQC s31 notification required     │
│                                                                                  │
│  ⚠ AUTO-FLAG: This resident has 2 previous falls this month. Consider          │
│    updating the falls risk assessment and care plan. [Review now]               │
│                                                                                  │
│  [Save Draft]                                          [Next: Assessment →]     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Rota & Shift Scheduler (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Rota — Oakwood House          Week: 09–15 March 2026   [← Prev] [Next →]       │
│  View: [Week] [Fortnight] [Month]       [Publish Rota] [Export] [+ Add Shift]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Min staffing: Early 8  |  Late 8  |  Night 4     🟢 All met this week          │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│              │  Mon 09  │  Tue 10  │  Wed 11  │  Thu 12  │  Fri 13  │  Sat 14  │ │
│              │          │          │          │          │          │  ⚠ gap   │ │
│ ─────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤ │
│ EARLY 07-14  │          │          │          │          │          │          │ │
│ Sarah Jones  │ ██████   │ ██████   │          │ ██████   │ ██████   │          │ │
│ Tom Rahman   │ ██████   │          │ ██████   │ ██████   │          │ ██████   │ │
│ Beth Adeyemi │ ██████   │ ██████   │ ██████   │          │ ██████   │ ██████   │ │
│ + 5 more     │ ...      │ ...      │ ...      │ ...      │ ...      │ ...      │ │
│              │  8/8 ✓   │  8/8 ✓   │  8/8 ✓   │  8/8 ✓   │  8/8 ✓   │  7/8 ⚠  │ │
│ ─────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤ │
│ LATE  14-21  │          │          │          │          │          │          │ │
│ Dan Collins  │    ██████│    ██████│          │    ██████│    ██████│          │ │
│ Amy Clarke   │          │    ██████│    ██████│    ██████│          │    ██████│ │
│ + 6 more     │ ...      │ ...      │ ...      │ ...      │ ...      │ ...      │ │
│              │  8/8 ✓   │  8/8 ✓   │  8/8 ✓   │  8/8 ✓   │  8/8 ✓   │  8/8 ✓  │ │
│ ─────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤ │
│ NIGHT 21-07  │          │          │          │          │          │          │ │
│ Kim Osei     │      ████│      ████│      ████│          │      ████│      ████│ │
│ + 3 more     │ ...      │ ...      │ ...      │ ...      │ ...      │ ...      │ │
│              │  4/4 ✓   │  4/4 ✓   │  4/4 ✓   │  4/4 ✓   │  4/4 ✓   │  4/4 ✓  │ │
│              │          │          │          │          │          │          │ │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ⚠ Saturday Early: 1 gap — [Find available staff]  [Book agency]  [Notify team] │
│  💡 Tip: Dan Collins is available Saturday and has 27h this week (cap: 48h)     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Staff Profile (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ← Staff List                                                                    │
│                                                                                  │
│  ┌── Profile Header ───────────────────────────────────────────────────────┐    │
│  │  [Photo]  Sarah Jones                          🟢 Active Employee       │    │
│  │  [  SJ ]  Role: Senior Care Assistant                                   │    │
│  │           Employed: 14 June 2021  (4y 9m)                               │    │
│  │           Contract: 37.5h / week (Full-time)                            │    │
│  │           Wing assignment: Wing A                                       │    │
│  │  [Edit Profile]  [Manage Shifts]  [Training Record]  [HR Documents]     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌── Compliance Status ────────────────────────────────────────────────────┐    │
│  │  DBS Check        🟢 Clear  Enhanced  |  Issued: 03/2024 | Update Svc ✓│    │
│  │  Right to Work    🟢 Verified  |  Passport checked 14/06/2021          │    │
│  │  NMC/NVQ          ✓ NVQ Level 3 Health & Social Care                   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌── Training Matrix ──────────────────────────────────────────────────────┐    │
│  │  Course                   │ Status    │ Completed   │ Expires    │ Due  │    │
│  │  Manual Handling          │ 🟢 Done   │ 05/01/2026  │ 05/01/2027 │  ✓  │    │
│  │  Safeguarding Adults L2   │ 🟢 Done   │ 10/09/2025  │ 10/09/2027 │  ✓  │    │
│  │  Safeguarding Adults L3   │ 🟢 Done   │ 10/09/2025  │ 10/09/2027 │  ✓  │    │
│  │  Fire Safety              │ 🟢 Done   │ 14/11/2025  │ 14/11/2026 │  ✓  │    │
│  │  First Aid at Work        │ 🟡 Due    │ 01/03/2023  │ 01/03/2026 │ ⚠  │    │
│  │  Infection Control        │ 🟢 Done   │ 20/02/2026  │ 20/02/2027 │  ✓  │    │
│  │  Dementia Awareness       │ 🟢 Done   │ 12/08/2025  │ 12/08/2027 │  ✓  │    │
│  │  Medication Awareness     │ 🟢 Done   │ 30/06/2025  │ 30/06/2026 │  ✓  │    │
│  │  [+ Log Training]                                                       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌── Recent Shifts (last 4 weeks) ────────────────────────────────────────┐     │
│  │  Week 09/03:  Early Mon, Early Tue, Early Thu, Early Fri  =  30h       │     │
│  │  Week 02/03:  Early Mon, Late Wed, Early Thu, Early Fri   =  32.5h     │     │
│  │  This month so far: 62.5h / 150h contracted                            │     │
│  └────────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Finance Dashboard (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Finance — Oakwood House              March 2026          [Export] [Run Invoices]│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌── Revenue Summary ──────────┐  ┌── Occupancy Revenue ─────────────────────┐ │
│  │  This month (projected)     │  │  Self-funded (22)    £31,900/wk           │ │
│  │  £ 138,240                  │  │  Local Authority (12) £14,640/wk          │ │
│  │  ▲ £4,200 vs last month     │  │  CHC Funded (4)       £ 6,800/wk          │ │
│  │                             │  │  NHS FNC element      £    940/wk          │ │
│  │  Outstanding invoices: 8    │  │                                            │ │
│  │  Value: £12,450  🔴          │  │  Total:              £54,280/wk           │ │
│  │  Arrears >60 days: £3,200   │  └────────────────────────────────────────────┘ │
│  └─────────────────────────────┘                                                 │
│                                                                                  │
│  ┌── Resident Fee Status ─────────────────────────────────────────────────────┐ │
│  │  Name                │ Funder       │ Weekly Rate │ Invoice    │ Balance   │ │
│  ├──────────────────────┼──────────────┼─────────────┼────────────┼───────────┤ │
│  │ Thompson, Edith      │ Self-funded  │ £1,450      │ Paid ✓     │ £0        │ │
│  │ Patel, Meena         │ Local Auth.  │ £1,220      │ Pending    │ £0        │ │
│  │ Wilson, Derek        │ CHC NHS      │ £1,700      │ Submitted  │ £0        │ │
│  │ Singh, Gurpreet      │ Self-funded  │ £1,450      │ 🔴 Overdue  │ £2,900   │ │
│  │ Okafor, Helen        │ LA + FNC     │ £1,455      │ Hospital   │ £0        │ │
│  │ [+ 37 more residents]                                                      │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌── Monthly Revenue Trend ───────────────────────────────────────────────────┐ │
│  │                                                                             │ │
│  │  £150k ┤                                              ▐█▌                  │ │
│  │  £140k ┤           ▐█▌    ▐█▌    ▐█▌    ▐█▌   ▐█▌   ▐██▌                  │ │
│  │  £130k ┤  ▐█▌    ▐██▌  ▐██▌  ▐██▌  ▐██▌ ▐██▌  ▐███▌                       │ │
│  │  £120k ┼───────────────────────────────────── May 25 → Mar 26             │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  [Sync to Xero]  [Generate LA Remittance Report]  [Aged Debtors Report]         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Invoice Detail

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Invoice #INV-2026-0342                          [Download PDF]  [Send by Email] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌── CareCore Invoice ──────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │  Oakwood House Care Home                    INVOICE                      │   │
│  │  14 Oak Lane, Bristol BS1 2AB               Invoice #: INV-2026-0342    │   │
│  │  CQC Reg: 1-234567890                       Date: 01 March 2026         │   │
│  │  VAT Reg: GB 123456789                      Period: 01–31 March 2026    │   │
│  │                                                                          │   │
│  │  To:  Mr James Thompson (Son / Third Party Payer)                       │   │
│  │       12 Maple Avenue, Bristol BS3 4DE                                  │   │
│  │  For: Edith Thompson — Room 101                                         │   │
│  │                                                                          │   │
│  │  Description                    Days    Rate        Amount              │   │
│  │  ────────────────────────────────────────────────────────────────────   │   │
│  │  Residential care (March)        31    £207.14/day  £6,421.43          │   │
│  │  Personal hygiene supplies        —           —     £  45.00           │   │
│  │  Hairdresser (4 visits)           —    £  15.00     £  60.00           │   │
│  │  Chiropodist (1 visit)            —    £  25.00     £  25.00           │   │
│  │                                                                          │   │
│  │  Subtotal                                           £6,551.43           │   │
│  │  VAT (exempt — care services)                       £    0.00           │   │
│  │  TOTAL DUE                                          £6,551.43           │   │
│  │                                                                          │   │
│  │  Payment due: 31 March 2026                                             │   │
│  │  Bank: Lloyds Bank  |  Sort: 30-00-00  |  Acc: 12345678                │   │
│  │  Reference: INV-2026-0342-THOMPSON                                      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Status: 🔴 Unpaid (due in 21 days)                                              │
│  [Mark as Paid]  [Send Reminder]  [Raise Credit Note]  [View Payment History]   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 14. CQC Compliance Dashboard (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  CQC Compliance — Oakwood House              Last inspection: Sept 2024 — GOOD  │
│  Next inspection: estimated Q4 2026          [Generate Evidence Pack]            │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌── 5 Key Questions ──────────────────────────────────────────────────────────┐ │
│  │                                                                             │ │
│  │  SAFE                   EFFECTIVE              CARING                      │ │
│  │  ████████████ 91%       ██████████░░ 84%       █████████░░░ 78%            │ │
│  │  🟢 Good                🟡 Needs attention     🟡 Needs attention          │ │
│  │  11/12 evidence items   10/12 evidence items   7/9 evidence items          │ │
│  │                                                                             │ │
│  │  RESPONSIVE             WELL-LED                                           │ │
│  │  ████████████ 88%       ███████████░ 92%                                   │ │
│  │  🟢 Good                🟢 Good                                            │ │
│  │  7/8 evidence items     11/12 evidence items                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌── SAFE: Outstanding items ─────────────────────────────────────────────────┐ │
│  │  ⚠ DoLS renewals: 2 expiring within 30 days          [Manage DoLS →]      │ │
│  │  ⚠ Medicines audit: overdue by 4 days                [Complete audit →]   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌── Audit Tracker ────────────────────────────────────────────────────────┐    │
│  │  Audit                  │ Frequency │ Last Done  │ Due        │ Status  │    │
│  │  Medication audit       │ Monthly   │ 05/02/2026 │ 05/03/2026 │ 🔴 OD  │    │
│  │  Care plan review       │ 3-monthly │ 01/01/2026 │ 01/04/2026 │ 🟢 OK  │    │
│  │  H&S inspection         │ Quarterly │ 01/12/2025 │ 01/03/2026 │ 🟡 Due │    │
│  │  Fire drill             │ 6-monthly │ 10/09/2025 │ 10/03/2026 │ 🟡 Due │    │
│  │  MCA training audit     │ Annual    │ 14/06/2025 │ 14/06/2026 │ 🟢 OK  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌── Notifications to CQC (s31) ──────────────────────────────────────────────┐ │
│  │  Jan 2026 — Unexpected death (natural causes) — Submitted ✓               │ │
│  │  Feb 2026 — Safeguarding referral — Submitted ✓                           │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Family Portal — Home Screen (Mobile)

```
┌────────────────────────────────┐
│  CareCore Family               │
│  Oakwood House, Bristol    ⚙   │
├────────────────────────────────┤
│  Hello, James 👋               │
│  Updates for Edith Thompson    │
│  Room 101  •  Day 142          │
├────────────────────────────────┤
│  TODAY  10 March 2026          │
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │ 🍽  Breakfast             │  │
│  │ Ate 75% — porridge &     │  │
│  │ toast. Good appetite.    │  │
│  │ 07:30                    │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 😊 Mood: Happy (4/5)     │  │
│  │ "Very chatty this        │  │
│  │ morning, asked about     │  │
│  │ the grandchildren."      │  │
│  │ 08:00                    │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 💊 Medications            │  │
│  │ Morning medications      │  │
│  │ administered ✓           │  │
│  │ 08:14                    │  │
│  └──────────────────────────┘  │
├────────────────────────────────┤
│  [📅 Book a visit]             │
│  [💬 Message the team]         │
│  [📄 View care plan]           │
│  [📃 View latest invoice]      │
├────────────────────────────────┤
│  Upcoming                      │
│  📅 Your visit: Thu 13 Mar 14:00│
│  🩺 GP visit: Mon 17 Mar 10:30 │
├────────────────────────────────┤
│ 🏠 Home  📰 Updates  💬 Msgs  👤│
└────────────────────────────────┘
```

---

## 16. Inventory Dashboard (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Inventory — Oakwood House                          [New PO] [Receive Stock]     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌── Summary ─────────────────────────────────────────────────────────────────┐ │
│  │  🔴 Critical (reorder now): 3 items    🟡 Low (reorder soon): 7 items      │ │
│  │  🟢 Adequate: 142 items                📦 POs pending delivery: 2          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  Categories: [All] [PPE] [Clinical] [Medications] [Food] [Cleaning] [Equipment] │
│                                                                                  │
│  ┌── Stock List ──────────────────────────────────────────────────────────────┐ │
│  │  Item                   │ Category  │ On Hand │ Par Level │ Status │ Action│ │
│  ├─────────────────────────┼───────────┼─────────┼───────────┼────────┼───────┤ │
│  │ Nitrile Gloves (M) box  │ PPE       │    2    │    10     │ 🔴 LOW │ [Order│ │
│  │ Nitrile Gloves (L) box  │ PPE       │    4    │    10     │ 🟡     │ [Order│ │
│  │ Aprons (blue, 100pk)    │ PPE       │   12    │    8      │ 🟢     │       │ │
│  │ Type IIR Masks (50pk)   │ PPE       │    1    │    6      │ 🔴 LOW │ [Order│ │
│  │ Paracetamol 500mg 100s  │ Clinical  │   24    │    10     │ 🟢     │       │ │
│  │ Inco pads (large, 30pk) │ Clinical  │    3    │    8      │ 🔴 LOW │ [Order│ │
│  │ Wound dressings (assort)│ Clinical  │   15    │    6      │ 🟢     │       │ │
│  │ Hand sanitiser 500ml    │ Cleaning  │   20    │    12     │ 🟢     │       │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌── Pending Orders ────────────────────────────────────────────────────────┐   │
│  │  PO-2026-088  |  Supplies Direct  |  Ordered 08/03  |  Est delivery 12/03│   │
│  │  Items: Gloves (M) x20, Masks x10, Inco pads x20    |  Total: £245.00   │   │
│  │  Status: 🟡 In transit — [Mark Received]  [View PO]                      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

*Wireframes version: 1.0 — March 2026*
*All screens subject to usability testing with care home staff*
