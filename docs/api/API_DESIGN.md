# CareCore SaaS — API Design
> RESTful API specification for all core modules

---

## Conventions

### Base URL
```
Production:  https://api.carecore.co.uk/v1
Staging:     https://api.staging.carecore.co.uk/v1
```

### Authentication
All endpoints (except `/auth/*`) require a JWT Bearer token:
```
Authorization: Bearer <access_token>
X-Home-ID: <home_uuid>          (required for home-scoped operations)
X-Organisation-ID: <org_uuid>   (required for group-scoped operations)
```

### Request / Response Format
- Content-Type: `application/json`
- Dates: ISO 8601 — `2026-03-10T14:23:01.234Z`
- IDs: UUIDs — `550e8400-e29b-41d4-a716-446655440000`
- Pagination: cursor-based via `cursor` + `limit` params
- Errors follow RFC 7807 (Problem Details)

### Standard Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyJ9",
    "has_more": true,
    "total": 142
  }
}
```

### Standard Error Response
```json
{
  "type": "https://carecore.co.uk/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "NHS number must be 10 digits",
  "errors": [
    { "field": "nhs_number", "message": "Must be exactly 10 digits" }
  ],
  "trace_id": "abc-def-123"
}
```

### HTTP Status Codes
```
200  OK               — successful GET, PUT, PATCH
201  Created          — successful POST (resource created)
204  No Content       — successful DELETE
400  Bad Request      — malformed request body
401  Unauthorized     — missing or invalid JWT
403  Forbidden        — valid JWT but insufficient permissions
404  Not Found        — resource does not exist (or tenant mismatch)
409  Conflict         — duplicate resource (e.g. NHS number)
422  Unprocessable    — validation error
429  Too Many Reqs    — rate limit exceeded
500  Internal Error   — unexpected server error
```

---

## Module Index

1.  [Authentication](#1-authentication)
2.  [Organisations & Homes](#2-organisations--homes)
3.  [Residents](#3-residents)
4.  [Care Plans](#4-care-plans)
5.  [Medications & MAR](#5-medications--mar)
6.  [Care Notes](#6-care-notes)
7.  [Incidents](#7-incidents)
8.  [Risk Assessments](#8-risk-assessments)
9.  [Health Monitoring (Vitals)](#9-health-monitoring-vitals)
10. [Staff](#10-staff)
11. [Rota & Shifts](#11-rota--shifts)
12. [Finance & Billing](#12-finance--billing)
13. [Inventory](#13-inventory)
14. [Compliance & CQC](#14-compliance--cqc)
15. [Family Portal](#15-family-portal)
16. [Notifications & Alerts](#16-notifications--alerts)
17. [IoT & Devices](#17-iot--devices)
18. [Reports & Analytics](#18-reports--analytics)
19. [Audit Logs](#19-audit-logs)
20. [Webhooks](#20-webhooks)

---

## 1. Authentication

### POST /auth/login
```
Request:
{
  "email": "sarah.jones@oakwood.co.uk",
  "password": "••••••••"
}

Response 200:
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 900,
  "requires_mfa": true,
  "mfa_token": "mfa_abc123"
}
```

### POST /auth/mfa/verify
```
Request:
{
  "mfa_token": "mfa_abc123",
  "code": "123456",
  "trust_device": true
}

Response 200:
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "name": "Sarah Jones",
    "email": "sarah.jones@oakwood.co.uk",
    "role": "senior_carer",
    "homes": [{ "id": "uuid", "name": "Oakwood House" }],
    "permissions": ["residents:read", "mar:write", "incidents:write"]
  }
}
```

### POST /auth/refresh
```
Request:  { "refresh_token": "eyJhbGci..." }
Response: { "access_token": "...", "expires_in": 900 }
```

### POST /auth/logout
```
Response 204 — invalidates refresh token server-side
```

### POST /auth/password/reset-request
```
Request:  { "email": "sarah.jones@oakwood.co.uk" }
Response 204 — always returns 204 (prevent email enumeration)
```

---

## 2. Organisations & Homes

### GET /organisations/:org_id
```
Response 200:
{
  "id": "uuid",
  "name": "Sunrise Care Ltd",
  "type": "care_group",
  "subscription_tier": "professional",
  "homes_count": 3,
  "created_at": "2025-01-15T10:00:00Z"
}
```

### GET /organisations/:org_id/homes
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "Oakwood House",
      "cqc_registration_number": "1-234567890",
      "address": { "line1": "14 Oak Lane", "city": "Bristol", "postcode": "BS1 2AB" },
      "registered_manager": { "id": "uuid", "name": "Jane Smith" },
      "bed_capacity": 48,
      "current_occupancy": 42,
      "care_types": ["residential", "dementia"],
      "last_cqc_rating": "good",
      "last_cqc_inspection_date": "2024-09-15"
    }
  ]
}
```

### GET /homes/:home_id/dashboard
```
Response 200:
{
  "occupancy": { "total_beds": 48, "occupied": 42, "hospital": 1, "respite": 1 },
  "staffing": {
    "today": {
      "early": { "required": 8, "scheduled": 8, "present": 7 },
      "late":  { "required": 8, "scheduled": 7, "present": 0 },
      "night": { "required": 4, "scheduled": 4, "present": 0 }
    }
  },
  "alerts": {
    "mar_overdue": 3,
    "incidents_open": 1,
    "rota_gaps": 1,
    "inventory_low": 2,
    "dols_expiring_30d": 2
  },
  "wellbeing_7d": {
    "avg_mood": 3.8,
    "nutrition_good_pct": 78,
    "activity_participation_pct": 62,
    "mar_adherence_pct": 96
  }
}
```

---

## 3. Residents

### GET /homes/:home_id/residents
```
Query params:
  status=active|hospital|respite|discharged|deceased (default: active)
  care_type=residential|nursing|dementia|emi|respite
  wing_id=uuid
  search=string        (name, room number, NHS number)
  cursor=string
  limit=20 (max 100)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Edith Thompson",
      "preferred_name": "Edith",
      "date_of_birth": "1938-03-12",
      "age": 87,
      "nhs_number": "9434765281",
      "photo_url": "https://...",
      "room": { "id": "uuid", "number": "101", "wing": "Wing A" },
      "care_type": "residential",
      "status": "active",
      "admission_date": "2024-10-19",
      "length_of_stay_days": 142,
      "keyworker": { "id": "uuid", "name": "Sarah Jones" },
      "funding_source": "self_funded",
      "primary_diagnosis": ["vascular_dementia", "hypertension"],
      "top_risks": ["falls_medium"],
      "alerts": { "mar_due": false, "tasks_overdue": 3, "incidents_open": 0 }
    }
  ],
  "pagination": { "cursor": "...", "has_more": true, "total": 42 }
}
```

### POST /homes/:home_id/residents
```
Request:
{
  "full_name": "Gurpreet Singh",
  "preferred_name": "Gurpreet",
  "date_of_birth": "1943-06-14",
  "nhs_number": "9876543210",
  "gender": "male",
  "ethnicity": "asian_british_indian",
  "religion": "sikh",
  "first_language": "english",
  "room_id": "uuid",
  "care_type": "residential",
  "admission_date": "2026-02-11",
  "admission_from": "hospital_discharge",
  "referring_hospital": "Bristol Royal Infirmary",
  "gp": {
    "name": "Dr A. Mehta",
    "practice": "Clifton Medical Centre",
    "phone": "0117 123 4567",
    "address": "10 Clifton Down, Bristol BS8 3HW"
  },
  "nok": [
    {
      "name": "James Thompson",
      "relationship": "son",
      "phone": "07700 900123",
      "email": "james.t@email.com",
      "is_primary": true,
      "has_lpa_welfare": false,
      "has_lpa_finance": false
    }
  ],
  "funding_source": "self_funded",
  "allergies": [],
  "dnar_in_place": false
}

Response 201:
{
  "id": "uuid",
  "full_name": "Gurpreet Singh",
  ...
}
```

### GET /residents/:resident_id
```
Response 200: Full resident object including all relationships
{
  "id": "uuid",
  "full_name": "Edith Thompson",
  ...
  "allergies": [
    { "substance": "Penicillin", "reaction": "Anaphylaxis", "severity": "severe" },
    { "substance": "Aspirin", "reaction": "GI upset", "severity": "moderate", "notes": "caution only" }
  ],
  "diagnoses": [
    { "code": "F01.9", "description": "Vascular dementia", "diagnosed_date": "2023-04-10" }
  ],
  "legal": {
    "dnar": { "in_place": true, "signed_date": "2026-01-04", "signed_by": "Dr A. Mehta" },
    "dols": { "active": true, "granted_date": "2025-09-30", "expiry_date": "2026-09-30" },
    "lpa_welfare": { "active": true, "holder_name": "James Thompson" },
    "lpa_finance": { "active": true, "holder_name": "James Thompson" },
    "mca_lacks_capacity": true
  },
  "current_risks": { ... },
  "keyworker": { ... },
  "room": { ... },
  "funding": { ... }
}
```

### PATCH /residents/:resident_id
```
Request: Partial update — any fields from POST body
Response 200: Updated resident object
```

### POST /residents/:resident_id/discharge
```
Request:
{
  "discharge_date": "2026-03-10",
  "discharge_to": "hospital|home|other_care_home|deceased",
  "reason": "string",
  "notes": "string"
}
Response 200: Updated resident with status=discharged
```

### GET /residents/:resident_id/summary-pdf
```
Response: application/pdf — formatted care summary for GP/hospital
```

---

## 4. Care Plans

### GET /residents/:resident_id/care-plans
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "version": 3,
      "status": "current",
      "created_at": "2026-03-05T10:30:00Z",
      "created_by": { "id": "uuid", "name": "Nurse B. Adeyemi" },
      "approved_by": { "id": "uuid", "name": "Jane Smith" },
      "next_review_date": "2026-06-05",
      "sections_count": 10,
      "sections_complete": 10
    }
  ]
}
```

### GET /care-plans/:plan_id
```
Response 200:
{
  "id": "uuid",
  "resident_id": "uuid",
  "version": 3,
  "status": "current",
  "sections": {
    "personal_history": {
      "content": "Edith was born in Bristol...",
      "preferences": ["Female carer for personal care", "Prefers tea with no sugar"],
      "last_updated": "2026-03-05T10:30:00Z",
      "updated_by": "uuid"
    },
    "mobility": {
      "what_resident_can_do": "Walk short distances with Zimmer frame...",
      "support_needed": ["Prompt and encourage to use Zimmer frame", "Standby assist for transfers"],
      "preferred_approach": "Always explain actions before doing them",
      "equipment": ["Zimmer frame ZF-0234", "Bed rails (both sides)", "Nimbus 3 mattress overlay"],
      "last_updated": "2026-03-05T10:30:00Z"
    },
    "nutrition": { ... },
    "continence": { ... },
    "personal_care": { ... },
    "sleep": { ... },
    "medication": { ... },
    "social_activities": { ... },
    "communication": { ... },
    "end_of_life": { ... }
  }
}
```

### POST /residents/:resident_id/care-plans
```
Creates a new version, copies forward from previous current plan
Request: { "initiated_by": "uuid", "sections": { ... } }
Response 201: New care plan object
```

### PATCH /care-plans/:plan_id/sections/:section_name
```
Request:  { "content": "...", "updated_by": "uuid" }
Response 200: Updated section
```

### POST /care-plans/:plan_id/approve
```
Request:  { "approved_by": "uuid", "signature": "base64_image" }
Response 200: { "status": "current", "approved_at": "..." }
```

---

## 5. Medications & MAR

### GET /residents/:resident_id/medications
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "drug_name": "Amlodipine",
      "form": "tablet",
      "strength": "5mg",
      "dose": "1 tablet",
      "route": "oral",
      "frequency": "twice_daily",
      "times": ["08:00", "18:00"],
      "indication": "Hypertension",
      "prescriber": "Dr A. Mehta",
      "prescribed_date": "2025-11-20",
      "review_date": "2026-05-20",
      "status": "active",
      "is_controlled_drug": false,
      "is_prn": false,
      "instructions": "Take with food",
      "stock_on_hand": 18
    }
  ]
}
```

### POST /residents/:resident_id/medications
```
Request: Full medication object (see above structure)
Response 201: Created medication
```

### PATCH /medications/:med_id
```
Amend medication details — creates audit trail entry
Response 200: Updated medication
```

### DELETE /medications/:med_id (soft delete — discontinue)
```
Request:  { "discontinued_date": "2026-03-10", "reason": "...", "discontinued_by": "uuid" }
Response 200: { "status": "discontinued" }
```

### GET /homes/:home_id/mar
```
Returns MAR chart data for all residents for a given period

Query params:
  date=2026-03-10       (single day, default: today)
  month=2026-03         (full month view)
  resident_id=uuid      (filter to one resident)
  round=08:00|12:00|18:00|21:00 (filter to one round)
  status=overdue|pending|complete

Response 200:
{
  "date": "2026-03-10",
  "rounds": {
    "08:00": [
      {
        "resident_id": "uuid",
        "resident_name": "Edith Thompson",
        "room": "101",
        "medication_id": "uuid",
        "drug_name": "Amlodipine 5mg",
        "dose": "1 tablet",
        "route": "oral",
        "is_controlled_drug": false,
        "status": "given",
        "administered_at": "2026-03-10T08:14:00Z",
        "administered_by": { "id": "uuid", "name": "Sarah Jones" },
        "notes": null
      }
    ]
  }
}
```

### POST /mar/administer
```
Record a medication administration

Request:
{
  "medication_id": "uuid",
  "resident_id": "uuid",
  "scheduled_time": "2026-03-10T08:00:00Z",
  "outcome": "given|refused|not_available|away|unable",
  "administered_by": "uuid",
  "administered_at": "2026-03-10T08:14:22Z",
  "witness_id": "uuid",          (required for controlled drugs)
  "notes": "string"              (required if outcome != given)
}

Response 201:
{
  "id": "uuid",
  "outcome": "given",
  "administered_at": "2026-03-10T08:14:22Z"
}
```

### GET /residents/:resident_id/controlled-drug-register
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "drug_name": "Codeine Phosphate 30mg",
      "date": "2026-03-10",
      "time": "08:15:00",
      "action": "administered",
      "quantity_in": null,
      "quantity_out": 1,
      "running_balance": 27,
      "administered_by": { "id": "uuid", "name": "Sarah Jones" },
      "witness": { "id": "uuid", "name": "Tom Rahman" },
      "resident_id": "uuid"
    }
  ]
}
```

---

## 6. Care Notes

### GET /residents/:resident_id/care-notes
```
Query params:
  date=2026-03-10
  from=2026-03-01&to=2026-03-10
  category=personal_care|nutrition|medication|mobility|mood|sleep|medical|general
  shift=early|late|night
  cursor=string
  limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "resident_id": "uuid",
      "created_at": "2026-03-10T07:15:00Z",
      "shift": "early",
      "categories": ["personal_care", "nutrition"],
      "note": "Assisted Edith with morning wash and dress...",
      "mood_score": 4,
      "fluid_intake_ml": null,
      "food_intake_pct": 75,
      "created_by": { "id": "uuid", "name": "Sarah Jones", "role": "senior_carer" },
      "attachments": [],
      "flagged": false
    }
  ],
  "pagination": { ... }
}
```

### POST /residents/:resident_id/care-notes
```
Request:
{
  "shift": "early",
  "categories": ["personal_care", "nutrition"],
  "note": "Assisted with morning wash...",
  "mood_score": 4,
  "fluid_intake_ml": 350,
  "food_intake_pct": 75,
  "created_by": "uuid",
  "attachments": ["s3-key-1", "s3-key-2"]
}
Response 201: Created care note
```

### POST /care-notes/bulk
```
Batch submission from offline mobile sync
Request: { "notes": [ ...array of care note objects with offline_id... ] }
Response 207: Multi-status — { "created": [...], "failed": [...] }
```

### PATCH /care-notes/:note_id
```
Edit within 2 hours of creation only (after that, add addendum)
Response 200: Updated note with edit_history
```

### POST /care-notes/:note_id/addendum
```
Add a note addendum (immutable, logged)
Request:  { "text": "...", "added_by": "uuid" }
Response 201: Addendum object
```

---

## 7. Incidents

### GET /homes/:home_id/incidents
```
Query params:
  status=open|under_review|closed
  type=fall|medication_error|safeguarding|injury|near_miss|complaint|infection
  severity=low|medium|high|critical
  resident_id=uuid
  from=2026-03-01&to=2026-03-31
  cursor=string
  limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "reference": "INC-2026-0094",
      "type": "fall",
      "severity": "medium",
      "status": "under_review",
      "occurred_at": "2026-03-10T14:23:00Z",
      "reported_at": "2026-03-10T14:35:00Z",
      "location": "bedroom",
      "resident": { "id": "uuid", "name": "Edith Thompson", "room": "101" },
      "reported_by": { "id": "uuid", "name": "Sarah Jones" },
      "injury_sustained": false,
      "cqc_notifiable": false,
      "family_notified": true,
      "gp_notified": false
    }
  ]
}
```

### POST /homes/:home_id/incidents
```
Request:
{
  "type": "fall",
  "occurred_at": "2026-03-10T14:23:00Z",
  "location": "bedroom",
  "location_detail": "Rm 101 — next to bed",
  "resident_id": "uuid",
  "description": "Edith was found on the floor...",
  "immediate_actions": ["called_for_assistance", "resident_assessed", "gp_nurse_notified", "family_notified"],
  "witnesses": [
    { "staff_id": "uuid", "name": "Tom Rahman" }
  ],
  "injury_sustained": false,
  "injury_description": null,
  "reported_by": "uuid"
}
Response 201: Created incident with reference number
```

### GET /incidents/:incident_id
```
Response 200: Full incident with all related records
{
  "id": "uuid",
  "reference": "INC-2026-0094",
  ...
  "investigation": {
    "root_cause": null,
    "contributing_factors": [],
    "lessons_learned": null,
    "actions_taken": [],
    "completed_by": null,
    "completed_at": null
  },
  "cqc_notification": null,
  "follow_up_risk_review_required": true,
  "timeline": [
    { "at": "...", "action": "incident_reported", "by": "..." },
    { "at": "...", "action": "family_notified", "by": "..." }
  ]
}
```

### PATCH /incidents/:incident_id
```
Update status, add investigation details, close incident
Request: Partial update object
Response 200: Updated incident
```

### POST /incidents/:incident_id/cqc-notify
```
Trigger CQC s31 notification workflow
Request: { "notification_type": "unexpected_death|abuse|serious_injury", "details": "..." }
Response 201: { "notification_ref": "CQC-2026-XXX", "submitted_at": "..." }
```

---

## 8. Risk Assessments

### GET /residents/:resident_id/risk-assessments
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "type": "falls|waterlow|must|cognitive|moving_handling|skin_integrity",
      "score": 12,
      "risk_level": "low|medium|high|very_high",
      "assessed_at": "2026-03-01T11:00:00Z",
      "assessed_by": { "id": "uuid", "name": "Nurse B. Adeyemi" },
      "valid_until": "2026-06-01",
      "details": { ... type-specific scoring breakdown ... }
    }
  ]
}
```

### POST /residents/:resident_id/risk-assessments
```
Request:
{
  "type": "falls",
  "assessed_by": "uuid",
  "assessed_at": "2026-03-10T10:00:00Z",
  "details": {
    "previous_falls": 2,
    "gait_instability": true,
    "visual_impairment": false,
    "cognitive_impairment": true,
    "medications_risk": true,
    "continence_issues": false,
    "environmental_hazards": false
  }
}
Response 201: Assessment with calculated score and risk_level
```

---

## 9. Health Monitoring (Vitals)

### GET /residents/:resident_id/vitals
```
Query params:
  type=blood_pressure|pulse|oxygen_saturation|temperature|weight|blood_glucose|respiration
  from=2026-02-10
  to=2026-03-10
  limit=100

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "type": "blood_pressure",
      "value": { "systolic": 138, "diastolic": 84 },
      "unit": "mmHg",
      "recorded_at": "2026-03-10T14:00:00Z",
      "recorded_by": { "id": "uuid", "name": "Nurse B. Adeyemi" },
      "source": "manual|iot_device",
      "device_id": null,
      "within_target_range": true,
      "alert_triggered": false
    }
  ],
  "targets": {
    "blood_pressure": { "systolic_min": 110, "systolic_max": 150, "diastolic_min": 60, "diastolic_max": 95 }
  }
}
```

### POST /residents/:resident_id/vitals
```
Request:
{
  "type": "blood_pressure",
  "value": { "systolic": 138, "diastolic": 84 },
  "recorded_at": "2026-03-10T14:00:00Z",
  "recorded_by": "uuid",
  "source": "manual",
  "notes": "Post-medication check"
}
Response 201: Recorded vital with alert_triggered flag
```

### PUT /residents/:resident_id/vitals/targets
```
Set target ranges per resident
Request:
{
  "blood_pressure": { "systolic_min": 110, "systolic_max": 150 },
  "weight": { "min_kg": 50, "max_kg": 70 }
}
Response 200: Updated targets
```

---

## 10. Staff

### GET /homes/:home_id/staff
```
Query params:
  role=carer|senior_carer|nurse|home_manager|registered_manager|admin
  status=active|on_leave|terminated
  search=string

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Sarah Jones",
      "role": "senior_carer",
      "employment_type": "full_time",
      "contracted_hours_per_week": 37.5,
      "start_date": "2021-06-14",
      "status": "active",
      "compliance": {
        "dbs_status": "clear",
        "dbs_expiry": null,
        "right_to_work_verified": true,
        "mandatory_training_complete": false,
        "training_overdue_count": 1
      }
    }
  ]
}
```

### POST /homes/:home_id/staff
```
Request: Full staff profile object
Response 201: Created staff member
```

### GET /staff/:staff_id/training
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "course_name": "Manual Handling",
      "course_type": "mandatory|recommended|specialist",
      "provider": "CareLearn Online",
      "completed_date": "2026-01-05",
      "expiry_date": "2027-01-05",
      "evidence_document_key": "s3://...",
      "status": "current|due|overdue|expired"
    }
  ],
  "summary": {
    "mandatory_complete": 7,
    "mandatory_total": 8,
    "overdue": ["First Aid at Work"]
  }
}
```

### POST /staff/:staff_id/training
```
Request:
{
  "course_name": "First Aid at Work",
  "course_type": "mandatory",
  "provider": "St John Ambulance",
  "completed_date": "2026-03-10",
  "expiry_date": "2029-03-10",
  "evidence_document_key": "s3://..."
}
Response 201: Training record
```

---

## 11. Rota & Shifts

### GET /homes/:home_id/rota
```
Query params:
  week=2026-W11              (ISO week)
  from=2026-03-09&to=2026-03-15
  staff_id=uuid
  shift_type=early|late|night

Response 200:
{
  "week": "2026-W11",
  "from": "2026-03-09",
  "to": "2026-03-15",
  "staffing_requirements": {
    "early": 8, "late": 8, "night": 4
  },
  "days": {
    "2026-03-09": {
      "early": {
        "required": 8,
        "scheduled": 8,
        "shifts": [
          {
            "id": "uuid",
            "staff": { "id": "uuid", "name": "Sarah Jones", "role": "senior_carer" },
            "start": "07:00",
            "end": "14:00",
            "status": "confirmed|pending|absent|agency"
          }
        ]
      }
    }
  },
  "gaps": [
    { "date": "2026-03-14", "shift_type": "early", "gaps": 1 }
  ]
}
```

### POST /homes/:home_id/shifts
```
Create a shift assignment
Request:
{
  "staff_id": "uuid",
  "date": "2026-03-14",
  "shift_type": "early",
  "start_time": "07:00",
  "end_time": "14:30",
  "role": "carer",
  "is_agency": false
}
Response 201: Shift object
```

### DELETE /shifts/:shift_id
```
Remove a shift (must have >4h notice or require manager override)
Response 204
```

### POST /shifts/:shift_id/attendance
```
Clock in or out
Request:
{
  "action": "clock_in|clock_out",
  "timestamp": "2026-03-10T07:03:00Z",
  "method": "pin|qr_code|manual"
}
Response 200: Attendance record
```

### GET /homes/:home_id/rota/gaps
```
Returns unfilled shift gaps for the next 14 days
Response 200:
{
  "gaps": [
    {
      "date": "2026-03-14",
      "shift_type": "early",
      "required": 8,
      "scheduled": 7,
      "gap": 1,
      "available_staff": [
        { "id": "uuid", "name": "Dan Collins", "hours_this_week": 27, "hours_cap": 48 }
      ]
    }
  ]
}
```

---

## 12. Finance & Billing

### GET /homes/:home_id/finance/dashboard
```
Response 200:
{
  "month": "2026-03",
  "projected_revenue": 138240.00,
  "invoiced": 125600.00,
  "collected": 112200.00,
  "outstanding": 13400.00,
  "overdue_60d": 3200.00,
  "occupancy_revenue_breakdown": {
    "self_funded": { "residents": 22, "weekly_rate_total": 31900.00 },
    "local_authority": { "residents": 12, "weekly_rate_total": 14640.00 },
    "chc": { "residents": 4, "weekly_rate_total": 6800.00 },
    "nhs_fnc": { "weekly_amount": 940.00 }
  }
}
```

### GET /residents/:resident_id/contracts
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "start_date": "2024-10-19",
      "end_date": null,
      "room_rate_weekly": 1450.00,
      "care_uplift_weekly": 0,
      "extras": [
        { "description": "Hairdresser", "rate": 15.00, "frequency": "weekly" }
      ],
      "notice_period_days": 28,
      "funding_source": "self_funded",
      "invoice_to": {
        "name": "James Thompson",
        "address": "12 Maple Avenue, Bristol BS3 4DE",
        "email": "james.t@email.com"
      }
    }
  ]
}
```

### GET /homes/:home_id/invoices
```
Query params:
  status=draft|sent|paid|overdue|void
  resident_id=uuid
  from=2026-03-01&to=2026-03-31

Response 200: Paginated list of invoice summaries
```

### POST /homes/:home_id/invoices/generate
```
Generate invoices for a billing period
Request:
{
  "period_start": "2026-03-01",
  "period_end": "2026-03-31",
  "resident_ids": ["uuid1", "uuid2"]  (empty = all active residents)
}
Response 201:
{
  "generated": 40,
  "total_value": 252480.00,
  "invoice_ids": ["uuid1", "uuid2", ...]
}
```

### GET /invoices/:invoice_id
```
Response 200: Full invoice with line items
```

### POST /invoices/:invoice_id/send
```
Email invoice to billing contact
Response 200: { "sent_at": "...", "sent_to": "james.t@email.com" }
```

### POST /invoices/:invoice_id/payments
```
Record a payment
Request:
{
  "amount": 6551.43,
  "method": "bank_transfer|cheque|card|direct_debit",
  "reference": "INV-2026-0342-THOMPSON",
  "received_date": "2026-03-15",
  "notes": ""
}
Response 201: Payment record, invoice status updated
```

---

## 13. Inventory

### GET /homes/:home_id/inventory
```
Query params:
  category=ppe|clinical|medication_stock|food|cleaning|equipment
  status=ok|low|critical|out_of_stock
  search=string

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "Nitrile Gloves (M)",
      "category": "ppe",
      "unit": "box",
      "quantity_on_hand": 2,
      "par_level": 10,
      "reorder_point": 4,
      "reorder_quantity": 20,
      "status": "critical",
      "preferred_supplier_id": "uuid",
      "unit_cost": 7.50,
      "last_restocked": "2026-02-28T09:00:00Z"
    }
  ],
  "summary": {
    "critical": 3,
    "low": 7,
    "adequate": 142
  }
}
```

### POST /homes/:home_id/inventory/items
```
Request: Item object (see above structure)
Response 201: Created item
```

### POST /inventory/items/:item_id/adjustments
```
Record stock in or out
Request:
{
  "type": "restock|usage|waste|transfer",
  "quantity_change": 20,
  "notes": "Weekly delivery from Supplies Direct",
  "recorded_by": "uuid"
}
Response 200: Updated item with new quantity_on_hand
```

### GET /homes/:home_id/purchase-orders
```
Response 200: Paginated PO list
```

### POST /homes/:home_id/purchase-orders
```
Request:
{
  "supplier_id": "uuid",
  "items": [
    { "inventory_item_id": "uuid", "quantity": 20, "unit_cost": 7.50 }
  ],
  "notes": "Urgent — gloves critical",
  "raised_by": "uuid"
}
Response 201: PO object with total value
```

---

## 14. Compliance & CQC

### GET /homes/:home_id/compliance/dashboard
```
Response 200:
{
  "last_cqc_inspection": { "date": "2024-09-15", "rating": "good" },
  "next_inspection_estimate": "2026-Q4",
  "key_questions": {
    "safe":       { "score_pct": 91, "rating": "good",   "evidence_complete": 11, "evidence_total": 12 },
    "effective":  { "score_pct": 84, "rating": "requires_improvement", "evidence_complete": 10, "evidence_total": 12 },
    "caring":     { "score_pct": 78, "rating": "requires_improvement", "evidence_complete": 7, "evidence_total": 9 },
    "responsive": { "score_pct": 88, "rating": "good",   "evidence_complete": 7, "evidence_total": 8 },
    "well_led":   { "score_pct": 92, "rating": "good",   "evidence_complete": 11, "evidence_total": 12 }
  },
  "outstanding_items": [
    { "domain": "safe", "item": "DoLS renewals — 2 expiring in 30 days", "action_url": "/dols" },
    { "domain": "safe", "item": "Medication audit overdue", "action_url": "/audits/med-audit" }
  ]
}
```

### GET /homes/:home_id/dols
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "resident_id": "uuid",
      "resident_name": "Edith Thompson",
      "application_date": "2025-09-01",
      "granted_date": "2025-09-30",
      "expiry_date": "2026-09-30",
      "best_interest_assessor": "Bristol City Council",
      "mental_health_assessor": "Dr J. Williams",
      "status": "active",
      "days_until_expiry": 204,
      "renewal_initiated": false
    }
  ]
}
```

### GET /homes/:home_id/audits
```
Response 200: List of all audits with status and due dates
```

### POST /homes/:home_id/audits
```
Create and complete an audit
Request:
{
  "audit_type": "medication|care_plan|environment|health_safety|infection_control",
  "date": "2026-03-10",
  "conducted_by": "uuid",
  "findings": [ ... type-specific checklist answers ... ],
  "overall_score_pct": 96,
  "actions_required": [
    { "finding": "2 MAR charts not fully completed", "action": "Remind staff at handover", "due_date": "2026-03-14", "assigned_to": "uuid" }
  ]
}
Response 201: Completed audit
```

---

## 15. Family Portal

### GET /family/portal/:resident_id
```
Auth: Family member token (scoped to resident only)
Response 200:
{
  "resident": {
    "name": "Edith Thompson",
    "preferred_name": "Edith",
    "room": "101",
    "photo_url": "...",
    "keyworker": "Sarah Jones",
    "admission_date": "2024-10-19"
  },
  "today": {
    "date": "2026-03-10",
    "updates": [
      { "time": "07:30", "type": "nutrition", "summary": "Ate 75% of breakfast — porridge and toast. Good appetite." },
      { "time": "08:00", "type": "mood", "summary": "Happy today (4/5) — very chatty this morning." },
      { "time": "08:14", "type": "medication", "summary": "Morning medications administered." }
    ]
  },
  "upcoming": [
    { "date": "2026-03-13", "type": "visit", "description": "Your visit — 14:00" },
    { "date": "2026-03-17", "type": "appointment", "description": "GP visit — 10:30" }
  ]
}
```

### GET /family/portal/:resident_id/messages
```
Secure message thread between family and home
Response 200: Message thread with pagination
```

### POST /family/portal/:resident_id/messages
```
Request:  { "message": "How is Mum feeling today?" }
Response 201: Message with auto-notify to home manager
```

### POST /family/portal/:resident_id/visits
```
Book a visit
Request:
{
  "type": "in_person|virtual",
  "date": "2026-03-13",
  "time": "14:00",
  "duration_minutes": 60,
  "attendees": ["James Thompson"],
  "notes": "Bringing grandchildren"
}
Response 201: Booking confirmation
```

---

## 16. Notifications & Alerts

### GET /users/:user_id/notifications
```
Query params:
  unread=true
  type=alert|task|message|system
  limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "type": "alert",
      "priority": "high",
      "title": "MAR overdue — 3 residents",
      "body": "Morning medications due at 08:00 not yet recorded for rooms 102, 107, 112",
      "action_url": "/mar?date=today&status=overdue",
      "read": false,
      "created_at": "2026-03-10T08:30:00Z"
    }
  ],
  "unread_count": 3
}
```

### POST /notifications/:notification_id/read
```
Response 204
```

### PUT /users/:user_id/notification-preferences
```
Request:
{
  "mar_reminders": { "enabled": true, "advance_minutes": 15 },
  "incident_alerts": { "enabled": true, "channels": ["push", "sms"] },
  "rota_gaps": { "enabled": true, "channels": ["push", "email"] },
  "family_messages": { "enabled": true, "channels": ["push"] }
}
Response 200: Updated preferences
```

---

## 17. IoT & Devices

### GET /homes/:home_id/devices
```
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "device_type": "fall_detector|wearable|bp_monitor|call_bell|bed_sensor|door_sensor",
      "manufacturer": "Tunstall",
      "model": "Lifeline Vi",
      "serial_number": "TUN-20340",
      "resident_id": "uuid",
      "resident_name": "Edith Thompson",
      "room": "101",
      "status": "online|offline|low_battery|fault",
      "battery_pct": 82,
      "last_seen": "2026-03-10T14:25:00Z",
      "firmware_version": "3.2.1"
    }
  ]
}
```

### GET /homes/:home_id/devices/alerts
```
Real-time IoT alerts feed
Query params:
  from=2026-03-10T00:00:00Z
  status=active|acknowledged|resolved
  type=fall|vital_alert|call_bell|door_alert

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "device_id": "uuid",
      "type": "fall",
      "resident_id": "uuid",
      "resident_name": "Edith Thompson",
      "room": "101",
      "triggered_at": "2026-03-10T14:23:00Z",
      "acknowledged_at": null,
      "acknowledged_by": null,
      "resolved_at": null,
      "response_time_seconds": null,
      "incident_created": false,
      "incident_id": null
    }
  ]
}
```

### POST /devices/alerts/:alert_id/acknowledge
```
Request:  { "acknowledged_by": "uuid", "notes": "En route to room 101" }
Response 200: Alert with acknowledged_at timestamp
```

### POST /devices/alerts/:alert_id/resolve
```
Request:  { "resolved_by": "uuid", "outcome": "false_alarm|incident_raised|no_incident", "incident_id": "uuid|null" }
Response 200: Resolved alert
```

---

## 18. Reports & Analytics

### GET /homes/:home_id/reports/care-quality
```
Query params: from=2026-02-01&to=2026-03-01

Response 200:
{
  "period": { "from": "2026-02-01", "to": "2026-03-01" },
  "mar_adherence_pct": 96.4,
  "task_completion_pct": 91.2,
  "incident_rate_per_100_resident_days": 2.1,
  "falls_count": 4,
  "falls_with_injury": 0,
  "avg_mood_score": 3.7,
  "activity_participation_pct": 64,
  "safeguarding_referrals": 0,
  "complaints": 1,
  "complaints_resolved_within_28d": 1
}
```

### GET /homes/:home_id/reports/staff-hours
```
Response 200: Staff hours, agency spend, sickness rate by period
```

### GET /organisations/:org_id/reports/benchmarking
```
Cross-home benchmarking — Group Admin only
Response 200: Per-home metrics side by side
```

### POST /homes/:home_id/reports/custom
```
Custom report builder
Request:
{
  "name": "Monthly Resident Wellbeing",
  "metrics": ["avg_mood", "activity_participation", "weight_trend"],
  "filters": { "care_type": "dementia" },
  "group_by": "week",
  "period": { "from": "2026-02-01", "to": "2026-03-01" }
}
Response 200: Report data object
```

---

## 19. Audit Logs

### GET /homes/:home_id/audit-logs
```
Restricted to: Home Manager, Registered Manager, Group Admin

Query params:
  resource_type=resident|medication|care_plan|incident|staff|finance
  resource_id=uuid
  user_id=uuid
  action=create|update|delete|view
  from=2026-03-01&to=2026-03-10
  cursor=string
  limit=50

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "timestamp": "2026-03-10T08:14:22Z",
      "user": { "id": "uuid", "name": "Sarah Jones", "role": "senior_carer" },
      "ip_address": "192.168.1.45",
      "resource_type": "mar_entry",
      "resource_id": "uuid",
      "action": "create",
      "before_state": null,
      "after_state": { "outcome": "given", "drug": "Amlodipine 5mg", "resident": "Edith Thompson" },
      "context": { "home_id": "uuid", "organisation_id": "uuid" }
    }
  ]
}
```

### GET /homes/:home_id/gdpr-access-logs
```
GDPR access log — tracks who viewed special category data
Response 200: Paginated access log entries
```

---

## 20. Webhooks

### POST /webhooks (register)
```
Request:
{
  "url": "https://your-system.co.uk/carecore/webhook",
  "events": [
    "incident.created",
    "incident.updated",
    "resident.admitted",
    "resident.discharged",
    "mar.overdue",
    "iot.fall_alert"
  ],
  "secret": "your_signing_secret"
}
Response 201: { "id": "uuid", "status": "active" }
```

### Webhook Payload Format
```json
{
  "event_id": "uuid",
  "event_type": "incident.created",
  "occurred_at": "2026-03-10T14:35:00Z",
  "home_id": "uuid",
  "organisation_id": "uuid",
  "data": { ... event-specific payload ... },
  "signature": "sha256=abc123..."
}
```

### Available Webhook Events
```
resident.admitted               resident.discharged
resident.care_plan_updated      resident.risk_level_changed
incident.created                incident.status_changed
incident.cqc_notified           mar.overdue
mar.administration_recorded     medication.error_flagged
iot.fall_alert                  iot.vital_alert
iot.call_bell                   rota.gap_detected
staff.training_expiring         dols.expiring
inventory.low_stock             invoice.overdue
family.message_received
```

---

## File Upload

### POST /uploads/presign
```
Get a pre-signed S3 URL for direct upload
Request:
{
  "filename": "wound-photo-2026-03-10.jpg",
  "content_type": "image/jpeg",
  "context": "wound_photo|care_note_attachment|document|staff_evidence",
  "resource_id": "uuid"
}
Response 200:
{
  "upload_url": "https://s3.amazonaws.com/...",
  "s3_key": "uploads/home-uuid/2026/03/wound-uuid.jpg",
  "expires_in": 300
}
```

### POST /uploads/confirm
```
Confirm upload completed
Request: { "s3_key": "uploads/..." }
Response 200: { "url": "https://...", "verified": true }
```

---

*API Version: 1.0*
*OpenAPI spec (YAML) to be generated from NestJS decorators*
*Breaking changes: minimum 3-month deprecation notice*
