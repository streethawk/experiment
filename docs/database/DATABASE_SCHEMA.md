# CareCore SaaS — Database Schema
> PostgreSQL 16 — Full DDL with indexes, constraints, RLS policies

---

## Design Principles

- **UUID primary keys** — all tables use `gen_random_uuid()`
- **Row-Level Security (RLS)** — enforced at DB layer, not just app layer
- **Soft deletes** — `deleted_at` timestamp, never hard-delete care records
- **Audit via triggers** — every UPDATE/DELETE on clinical tables triggers audit log entry
- **Timestamps** — all tables have `created_at`, `updated_at` managed by trigger
- **Enums** — used for constrained fields (status, type, role, etc.)
- **JSON columns** — for flexible structured data (assessment details, plan sections)
- **Search** — `tsvector` columns for full-text search on resident names, notes

---

## Extensions & Setup

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid(), encrypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- composite GIN indexes
CREATE EXTENSION IF NOT EXISTS "timescaledb";   -- IoT time-series (separate DB)

-- Shared timestamp trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit log trigger function (applied to clinical tables)
CREATE OR REPLACE FUNCTION audit_clinical_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    id, organisation_id, home_id,
    user_id, ip_address,
    resource_type, resource_id,
    action, before_state, after_state,
    created_at
  ) VALUES (
    gen_random_uuid(),
    current_setting('app.current_org_id', true)::uuid,
    current_setting('app.current_home_id', true)::uuid,
    current_setting('app.current_user_id', true)::uuid,
    current_setting('app.current_ip', true),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 1. Tenant Foundation

```sql
-- ─────────────────────────────────────────────
-- ORGANISATIONS (Care Groups)
-- ─────────────────────────────────────────────
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE org_type AS ENUM ('single_home', 'care_group', 'nhs_trust');

CREATE TABLE organisations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  type                  org_type NOT NULL DEFAULT 'single_home',
  subscription_tier     subscription_tier NOT NULL DEFAULT 'starter',
  subscription_start    DATE,
  subscription_end      DATE,
  billing_email         VARCHAR(255),
  ico_registration_ref  VARCHAR(50),
  companies_house_no    VARCHAR(20),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE TRIGGER trg_organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────
-- HOMES (Registered CQC locations)
-- ─────────────────────────────────────────────
CREATE TYPE cqc_rating AS ENUM ('outstanding', 'good', 'requires_improvement', 'inadequate', 'not_yet_rated');
CREATE TYPE care_type AS ENUM ('residential', 'nursing', 'dementia', 'emi', 'learning_disability', 'physical_disability', 'respite');

CREATE TABLE homes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id             UUID NOT NULL REFERENCES organisations(id),
  name                        VARCHAR(255) NOT NULL,
  cqc_registration_number     VARCHAR(20) UNIQUE,
  address_line1               VARCHAR(255) NOT NULL,
  address_line2               VARCHAR(255),
  city                        VARCHAR(100) NOT NULL,
  county                      VARCHAR(100),
  postcode                    VARCHAR(10) NOT NULL,
  phone                       VARCHAR(20),
  email                       VARCHAR(255),
  bed_capacity                SMALLINT NOT NULL,
  care_types                  care_type[] NOT NULL DEFAULT '{}',
  registered_manager_id       UUID,              -- FK to staff added after staff table
  last_cqc_inspection_date    DATE,
  last_cqc_rating             cqc_rating DEFAULT 'not_yet_rated',
  next_cqc_inspection_estimate VARCHAR(20),
  settings                    JSONB NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_homes_organisation_id ON homes(organisation_id);

CREATE TRIGGER trg_homes_updated_at
  BEFORE UPDATE ON homes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────
-- WINGS & ROOMS
-- ─────────────────────────────────────────────
CREATE TABLE wings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id     UUID NOT NULL REFERENCES homes(id),
  name        VARCHAR(100) NOT NULL,
  floor       SMALLINT,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wings_home_id ON wings(home_id);

CREATE TYPE room_type AS ENUM ('single', 'double', 'ensuite', 'shared');

CREATE TABLE rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wing_id         UUID NOT NULL REFERENCES wings(id),
  home_id         UUID NOT NULL REFERENCES homes(id),
  room_number     VARCHAR(20) NOT NULL,
  room_type       room_type NOT NULL DEFAULT 'single',
  floor           SMALLINT,
  bed_count       SMALLINT NOT NULL DEFAULT 1,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(home_id, room_number)
);

CREATE INDEX idx_rooms_home_id ON rooms(home_id);
CREATE INDEX idx_rooms_wing_id ON rooms(wing_id);
```

---

## 2. Residents

```sql
-- ─────────────────────────────────────────────
-- RESIDENTS
-- ─────────────────────────────────────────────
CREATE TYPE resident_status AS ENUM ('active', 'hospital', 'respite', 'leave', 'discharged', 'deceased');
CREATE TYPE gender AS ENUM ('male', 'female', 'non_binary', 'prefer_not_to_say');
CREATE TYPE funding_source_type AS ENUM ('self_funded', 'local_authority', 'chc', 'chc_fast_track', 'nhs_fnc', 'mixed', 'deferred_payment');
CREATE TYPE resident_care_type AS ENUM ('residential', 'nursing', 'dementia', 'emi', 'respite', 'end_of_life');
CREATE TYPE admission_source AS ENUM ('hospital_discharge', 'home', 'other_care_home', 'self_referral', 'la_referral', 'nhs_referral');

CREATE TABLE residents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id                 UUID NOT NULL REFERENCES homes(id),
  organisation_id         UUID NOT NULL REFERENCES organisations(id),
  room_id                 UUID REFERENCES rooms(id),

  -- Identity
  full_name               VARCHAR(255) NOT NULL,
  preferred_name          VARCHAR(100),
  date_of_birth           DATE NOT NULL,
  gender                  gender,
  ethnicity               VARCHAR(100),
  religion                VARCHAR(100),
  first_language          VARCHAR(100),
  interpreter_required    BOOLEAN NOT NULL DEFAULT FALSE,
  photo_s3_key            VARCHAR(500),

  -- NHS & GP
  nhs_number              VARCHAR(10),           -- stored unformatted, validated in app
  gp_name                 VARCHAR(255),
  gp_practice             VARCHAR(255),
  gp_phone                VARCHAR(20),
  gp_address              TEXT,
  gp_email                VARCHAR(255),

  -- Stay
  status                  resident_status NOT NULL DEFAULT 'active',
  care_type               resident_care_type NOT NULL,
  admission_date          DATE NOT NULL,
  admission_source        admission_source,
  discharge_date          DATE,
  discharge_to            VARCHAR(100),
  discharge_reason        TEXT,
  keyworker_id            UUID,              -- FK to staff

  -- Funding
  primary_funding_source  funding_source_type NOT NULL DEFAULT 'self_funded',

  -- Legal
  dnar_in_place           BOOLEAN NOT NULL DEFAULT FALSE,
  dnar_signed_date        DATE,
  dnar_signed_by          VARCHAR(255),
  dnar_document_s3_key    VARCHAR(500),
  mca_lacks_capacity      BOOLEAN,
  mca_assessment_date     DATE,

  -- Search
  search_vector           TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', full_name || ' ' || COALESCE(preferred_name, ''))
  ) STORED,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_residents_home_id ON residents(home_id);
CREATE INDEX idx_residents_organisation_id ON residents(organisation_id);
CREATE INDEX idx_residents_status ON residents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_nhs_number ON residents(nhs_number) WHERE nhs_number IS NOT NULL;
CREATE INDEX idx_residents_search ON residents USING GIN(search_vector);

CREATE TRIGGER trg_residents_updated_at
  BEFORE UPDATE ON residents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_residents_audit
  AFTER INSERT OR UPDATE OR DELETE ON residents
  FOR EACH ROW EXECUTE FUNCTION audit_clinical_change();


-- ─────────────────────────────────────────────
-- NEXT OF KIN / CONTACTS
-- ─────────────────────────────────────────────
CREATE TABLE resident_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id         UUID NOT NULL REFERENCES residents(id),
  name                VARCHAR(255) NOT NULL,
  relationship        VARCHAR(100) NOT NULL,
  phone_primary       VARCHAR(20),
  phone_secondary     VARCHAR(20),
  email               VARCHAR(255),
  address             TEXT,
  is_primary_nok      BOOLEAN NOT NULL DEFAULT FALSE,
  has_lpa_welfare     BOOLEAN NOT NULL DEFAULT FALSE,
  has_lpa_finance     BOOLEAN NOT NULL DEFAULT FALSE,
  lpa_registration_no VARCHAR(50),
  is_family_portal_user BOOLEAN NOT NULL DEFAULT FALSE,
  family_portal_user_id UUID,            -- FK to users
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resident_contacts_resident_id ON resident_contacts(resident_id);


-- ─────────────────────────────────────────────
-- ALLERGIES & ADVERSE REACTIONS
-- ─────────────────────────────────────────────
CREATE TYPE allergy_severity AS ENUM ('mild', 'moderate', 'severe', 'life_threatening');

CREATE TABLE allergies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  substance       VARCHAR(255) NOT NULL,
  reaction        TEXT NOT NULL,
  severity        allergy_severity NOT NULL,
  notes           TEXT,
  recorded_by     UUID NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_allergies_resident_id ON allergies(resident_id);


-- ─────────────────────────────────────────────
-- DIAGNOSES
-- ─────────────────────────────────────────────
CREATE TABLE diagnoses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id       UUID NOT NULL REFERENCES residents(id),
  icd10_code        VARCHAR(10),
  description       VARCHAR(500) NOT NULL,
  diagnosed_date    DATE,
  diagnosed_by      VARCHAR(255),
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnoses_resident_id ON diagnoses(resident_id);


-- ─────────────────────────────────────────────
-- LEGAL & MENTAL CAPACITY
-- ─────────────────────────────────────────────
CREATE TYPE dols_status AS ENUM ('not_required', 'application_pending', 'granted', 'refused', 'expired', 'withdrawn');

CREATE TABLE dols_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id             UUID NOT NULL REFERENCES residents(id),
  home_id                 UUID NOT NULL REFERENCES homes(id),
  application_date        DATE NOT NULL,
  supervisory_body        VARCHAR(255),          -- local authority name
  best_interest_assessor  VARCHAR(255),
  mental_health_assessor  VARCHAR(255),
  outcome                 dols_status NOT NULL DEFAULT 'application_pending',
  granted_date            DATE,
  expiry_date             DATE,
  conditions              TEXT,
  renewal_initiated       BOOLEAN NOT NULL DEFAULT FALSE,
  document_s3_key         VARCHAR(500),
  notes                   TEXT,
  created_by              UUID NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dols_resident_id ON dols_records(resident_id);
CREATE INDEX idx_dols_expiry ON dols_records(expiry_date) WHERE outcome = 'granted';

CREATE TABLE mca_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  decision_topic  VARCHAR(500) NOT NULL,         -- e.g. "Consent to care and treatment"
  capacity_found  BOOLEAN NOT NULL,
  assessed_by     UUID NOT NULL,
  assessed_at     TIMESTAMPTZ NOT NULL,
  best_interests  TEXT,                          -- if capacity not found
  review_date     DATE,
  document_s3_key VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Care Plans

```sql
CREATE TYPE care_plan_status AS ENUM ('draft', 'current', 'superseded', 'archived');

CREATE TABLE care_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  home_id         UUID NOT NULL REFERENCES homes(id),
  version         SMALLINT NOT NULL DEFAULT 1,
  status          care_plan_status NOT NULL DEFAULT 'draft',
  sections        JSONB NOT NULL DEFAULT '{}',   -- all section content
  created_by      UUID NOT NULL,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  next_review_date DATE,
  review_triggered_by VARCHAR(100),              -- e.g. "quarterly_review", "incident", "hospital_return"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_current_plan UNIQUE (resident_id, status)
    DEFERRABLE INITIALLY DEFERRED                -- allows swap from current to superseded
);

CREATE INDEX idx_care_plans_resident_id ON care_plans(resident_id);
CREATE INDEX idx_care_plans_status ON care_plans(resident_id, status);

CREATE TRIGGER trg_care_plans_updated_at
  BEFORE UPDATE ON care_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_care_plans_audit
  AFTER INSERT OR UPDATE ON care_plans
  FOR EACH ROW EXECUTE FUNCTION audit_clinical_change();


-- ─────────────────────────────────────────────
-- RISK ASSESSMENTS
-- ─────────────────────────────────────────────
CREATE TYPE risk_type AS ENUM (
  'falls', 'waterlow', 'must', 'cognitive_mmse', 'moving_handling',
  'skin_integrity', 'choking', 'behaviour', 'self_neglect', 'financial'
);
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'very_high');

CREATE TABLE risk_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  home_id         UUID NOT NULL REFERENCES homes(id),
  type            risk_type NOT NULL,
  score           SMALLINT,
  risk_level      risk_level NOT NULL,
  details         JSONB NOT NULL DEFAULT '{}',  -- type-specific scoring fields
  assessed_by     UUID NOT NULL,
  assessed_at     TIMESTAMPTZ NOT NULL,
  valid_until     DATE,
  superseded_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_assessments_resident_id ON risk_assessments(resident_id);
CREATE INDEX idx_risk_assessments_type ON risk_assessments(resident_id, type, assessed_at DESC);
```

---

## 4. Medications & MAR

```sql
CREATE TYPE medication_route AS ENUM (
  'oral', 'sublingual', 'topical', 'transdermal', 'subcutaneous',
  'intramuscular', 'intravenous', 'inhaled', 'rectal', 'ophthalmic',
  'otic', 'nasal', 'nebulised'
);
CREATE TYPE medication_frequency AS ENUM (
  'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily',
  'every_4_hours', 'every_6_hours', 'every_8_hours', 'every_12_hours',
  'weekly', 'fortnightly', 'monthly', 'when_required', 'stat', 'other'
);
CREATE TYPE medication_status AS ENUM ('active', 'on_hold', 'discontinued', 'completed');

CREATE TABLE medications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id         UUID NOT NULL REFERENCES residents(id),
  home_id             UUID NOT NULL REFERENCES homes(id),

  drug_name           VARCHAR(255) NOT NULL,
  generic_name        VARCHAR(255),
  form                VARCHAR(100),              -- tablet, capsule, liquid, patch, cream, etc.
  strength            VARCHAR(50),               -- 5mg, 10mg/5ml, etc.
  dose                VARCHAR(100) NOT NULL,     -- 1 tablet, 5ml, etc.
  route               medication_route NOT NULL,
  frequency           medication_frequency NOT NULL,
  times               TIME[],                    -- e.g. {08:00, 18:00}
  indication          TEXT,
  instructions        TEXT,
  is_prn              BOOLEAN NOT NULL DEFAULT FALSE,
  prn_max_dose_24h    VARCHAR(50),
  prn_min_interval_h  SMALLINT,
  prn_criteria        TEXT,

  is_controlled_drug  BOOLEAN NOT NULL DEFAULT FALSE,
  controlled_drug_schedule SMALLINT,             -- 1-5

  prescribed_by       VARCHAR(255),
  prescribed_date     DATE,
  review_date         DATE,
  dispensed_by        VARCHAR(255),              -- pharmacy name

  stock_on_hand       DECIMAL(10, 2),
  stock_unit          VARCHAR(50),               -- tablets, ml, patches

  status              medication_status NOT NULL DEFAULT 'active',
  discontinued_date   DATE,
  discontinued_by     UUID,
  discontinued_reason TEXT,

  created_by          UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medications_resident_id ON medications(resident_id);
CREATE INDEX idx_medications_active ON medications(resident_id, status) WHERE status = 'active';

CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_medications_audit
  AFTER INSERT OR UPDATE OR DELETE ON medications
  FOR EACH ROW EXECUTE FUNCTION audit_clinical_change();


-- ─────────────────────────────────────────────
-- MAR ENTRIES (Medication Administration Record)
-- ─────────────────────────────────────────────
CREATE TYPE mar_outcome AS ENUM (
  'given', 'refused', 'not_available', 'away', 'unable', 'not_required', 'self_administered'
);

CREATE TABLE mar_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id       UUID NOT NULL REFERENCES medications(id),
  resident_id         UUID NOT NULL REFERENCES residents(id),
  home_id             UUID NOT NULL REFERENCES homes(id),

  scheduled_time      TIMESTAMPTZ NOT NULL,
  administered_at     TIMESTAMPTZ,
  outcome             mar_outcome NOT NULL,

  administered_by     UUID NOT NULL,
  witness_id          UUID,                      -- required for controlled drugs

  dose_given          VARCHAR(100),              -- may differ from prescribed if instructed
  notes               TEXT,
  refusal_reason      TEXT,

  is_prn              BOOLEAN NOT NULL DEFAULT FALSE,
  prn_indication      TEXT,
  prn_effectiveness   TEXT,                      -- follow-up note

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mar_entries_resident_id ON mar_entries(resident_id, scheduled_time DESC);
CREATE INDEX idx_mar_entries_medication_id ON mar_entries(medication_id);
CREATE INDEX idx_mar_entries_home_date ON mar_entries(home_id, scheduled_time::DATE);
CREATE INDEX idx_mar_entries_overdue ON mar_entries(home_id, scheduled_time)
  WHERE outcome IS NULL;                         -- partial index for overdue check

CREATE TRIGGER trg_mar_entries_audit
  AFTER INSERT OR UPDATE ON mar_entries
  FOR EACH ROW EXECUTE FUNCTION audit_clinical_change();


-- ─────────────────────────────────────────────
-- CONTROLLED DRUG REGISTER
-- ─────────────────────────────────────────────
CREATE TYPE cd_action AS ENUM ('stock_received', 'administered', 'wasted', 'returned', 'destroyed', 'transferred');

CREATE TABLE controlled_drug_register (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id         UUID NOT NULL REFERENCES homes(id),
  medication_id   UUID NOT NULL REFERENCES medications(id),
  resident_id     UUID REFERENCES residents(id),
  action          cd_action NOT NULL,
  quantity_in     DECIMAL(10, 2),
  quantity_out    DECIMAL(10, 2),
  running_balance DECIMAL(10, 2) NOT NULL,
  action_by       UUID NOT NULL,
  witness_id      UUID NOT NULL,
  notes           TEXT,
  mar_entry_id    UUID REFERENCES mar_entries(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cd_register_home_id ON controlled_drug_register(home_id, created_at DESC);
CREATE INDEX idx_cd_register_medication_id ON controlled_drug_register(medication_id, created_at DESC);
```

---

## 5. Care Notes & Daily Records

```sql
CREATE TYPE care_note_shift AS ENUM ('early', 'late', 'night');
CREATE TYPE care_note_category AS ENUM (
  'personal_care', 'nutrition', 'hydration', 'medication', 'mobility',
  'continence', 'sleep', 'mood_behaviour', 'medical', 'social_activity',
  'wound_care', 'repositioning', 'handover', 'general'
);

CREATE TABLE care_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  home_id         UUID NOT NULL REFERENCES homes(id),

  shift           care_note_shift NOT NULL,
  categories      care_note_category[] NOT NULL,
  note            TEXT NOT NULL,

  -- Structured fields (optional, can be added to any note)
  mood_score      SMALLINT CHECK (mood_score BETWEEN 1 AND 5),
  food_intake_pct SMALLINT CHECK (food_intake_pct BETWEEN 0 AND 100),
  fluid_intake_ml SMALLINT,
  fluid_output_ml SMALLINT,

  is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason     TEXT,

  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at       TIMESTAMPTZ,
  edit_history    JSONB NOT NULL DEFAULT '[]',   -- array of {at, by, previous_note}
  deleted_at      TIMESTAMPTZ,

  -- Search
  search_vector   TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', note)
  ) STORED
);

CREATE INDEX idx_care_notes_resident_id ON care_notes(resident_id, created_at DESC);
CREATE INDEX idx_care_notes_home_shift ON care_notes(home_id, shift, created_at::DATE);
CREATE INDEX idx_care_notes_search ON care_notes USING GIN(search_vector);

CREATE TRIGGER trg_care_notes_updated_at
  BEFORE UPDATE ON care_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────
-- CARE NOTE ATTACHMENTS
-- ─────────────────────────────────────────────
CREATE TABLE care_note_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_note_id    UUID NOT NULL REFERENCES care_notes(id),
  s3_key          VARCHAR(500) NOT NULL,
  filename        VARCHAR(255) NOT NULL,
  content_type    VARCHAR(100),
  size_bytes      INTEGER,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────
-- WOUND CARE
-- ─────────────────────────────────────────────
CREATE TYPE wound_site AS ENUM (
  'sacrum', 'left_heel', 'right_heel', 'left_hip', 'right_hip',
  'left_elbow', 'right_elbow', 'left_ear', 'right_ear', 'other'
);
CREATE type wound_status AS ENUM ('open', 'healing', 'healed', 'deteriorating');

CREATE TABLE wounds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  site            wound_site NOT NULL,
  site_detail     VARCHAR(255),
  onset_date      DATE,
  wound_type      VARCHAR(100),
  cause           TEXT,
  status          wound_status NOT NULL DEFAULT 'open',
  healed_date     DATE,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wound_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_id        UUID NOT NULL REFERENCES wounds(id),
  assessed_at     TIMESTAMPTZ NOT NULL,
  assessed_by     UUID NOT NULL,
  length_mm       SMALLINT,
  width_mm        SMALLINT,
  depth_mm        SMALLINT,
  push_score      SMALLINT,                      -- Pressure Ulcer Scale for Healing
  tissue_type     VARCHAR(100),
  exudate_level   VARCHAR(50),
  surrounding_skin VARCHAR(100),
  dressing_used   VARCHAR(255),
  next_change_date DATE,
  photo_s3_key    VARCHAR(500),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Incidents

```sql
CREATE TYPE incident_type AS ENUM (
  'fall', 'medication_error', 'safeguarding', 'injury', 'near_miss',
  'complaint', 'infection', 'pressure_ulcer', 'elopement', 'aggression',
  'unexpected_death', 'other'
);
CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('open', 'under_review', 'pending_cqc', 'closed');

CREATE TABLE incidents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id             UUID NOT NULL REFERENCES homes(id),
  organisation_id     UUID NOT NULL REFERENCES organisations(id),
  reference           VARCHAR(30) UNIQUE NOT NULL,   -- INC-2026-0094 (generated)

  type                incident_type NOT NULL,
  severity            incident_severity NOT NULL DEFAULT 'low',
  status              incident_status NOT NULL DEFAULT 'open',

  resident_id         UUID REFERENCES residents(id),
  staff_involved_ids  UUID[],
  visitor_involved    BOOLEAN NOT NULL DEFAULT FALSE,
  visitor_name        VARCHAR(255),

  occurred_at         TIMESTAMPTZ NOT NULL,
  location            VARCHAR(100),
  location_detail     TEXT,
  description         TEXT NOT NULL,

  immediate_actions   TEXT[],
  injury_sustained    BOOLEAN NOT NULL DEFAULT FALSE,
  injury_description  TEXT,

  -- Notifications
  family_notified     BOOLEAN NOT NULL DEFAULT FALSE,
  family_notified_at  TIMESTAMPTZ,
  gp_notified         BOOLEAN NOT NULL DEFAULT FALSE,
  gp_notified_at      TIMESTAMPTZ,
  called_999          BOOLEAN NOT NULL DEFAULT FALSE,
  hospital_attended   BOOLEAN NOT NULL DEFAULT FALSE,

  -- CQC / Regulatory
  cqc_notifiable      BOOLEAN NOT NULL DEFAULT FALSE,
  cqc_notification_id UUID,

  -- Investigation
  root_cause          TEXT,
  contributing_factors TEXT[],
  lessons_learned     TEXT,
  actions_taken       JSONB NOT NULL DEFAULT '[]',   -- [{action, assigned_to, due_date, completed_at}]
  investigation_completed_by UUID,
  investigation_completed_at TIMESTAMPTZ,

  reported_by         UUID NOT NULL,
  reported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at           TIMESTAMPTZ,
  closed_by           UUID,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_home_id ON incidents(home_id, occurred_at DESC);
CREATE INDEX idx_incidents_resident_id ON incidents(resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX idx_incidents_status ON incidents(home_id, status);
CREATE INDEX idx_incidents_type ON incidents(home_id, type, occurred_at DESC);

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────
-- INCIDENT WITNESSES
-- ─────────────────────────────────────────────
CREATE TABLE incident_witnesses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  staff_id    UUID,
  name        VARCHAR(255) NOT NULL,
  statement   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────
-- SAFEGUARDING RECORDS
-- ─────────────────────────────────────────────
CREATE TYPE safeguarding_status AS ENUM (
  'concern_raised', 'referral_submitted', 'strategy_meeting', 'investigation', 'closed_substantiated', 'closed_unsubstantiated'
);

CREATE TABLE safeguarding_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id             UUID REFERENCES incidents(id),
  home_id                 UUID NOT NULL REFERENCES homes(id),
  resident_id             UUID NOT NULL REFERENCES residents(id),
  concern_type            VARCHAR(100) NOT NULL,
  status                  safeguarding_status NOT NULL DEFAULT 'concern_raised',
  la_referral_date        DATE,
  la_reference            VARCHAR(100),
  lado_involved           BOOLEAN NOT NULL DEFAULT FALSE,
  strategy_meeting_date   DATE,
  outcome                 TEXT,
  created_by              UUID NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Health Monitoring

```sql
CREATE TYPE vital_type AS ENUM (
  'blood_pressure', 'pulse', 'oxygen_saturation', 'temperature',
  'weight', 'blood_glucose', 'respiration_rate', 'pain_score'
);
CREATE TYPE vital_source AS ENUM ('manual', 'iot_device', 'imported');

CREATE TABLE vitals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  home_id         UUID NOT NULL REFERENCES homes(id),
  type            vital_type NOT NULL,
  value           JSONB NOT NULL,                -- {systolic: 138, diastolic: 84} or {value: 97.2}
  unit            VARCHAR(20),
  source          vital_source NOT NULL DEFAULT 'manual',
  device_id       UUID,
  within_range    BOOLEAN,
  alert_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_by     UUID,
  recorded_at     TIMESTAMPTZ NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vitals_resident_type ON vitals(resident_id, type, recorded_at DESC);
CREATE INDEX idx_vitals_home_date ON vitals(home_id, recorded_at::DATE);
CREATE INDEX idx_vitals_alerts ON vitals(home_id, recorded_at DESC) WHERE alert_triggered = TRUE;


-- ─────────────────────────────────────────────
-- VITALS TARGET RANGES (per resident)
-- ─────────────────────────────────────────────
CREATE TABLE vital_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id) UNIQUE,
  targets         JSONB NOT NULL DEFAULT '{}',   -- {blood_pressure: {systolic_min: 110, ...}}
  set_by          UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 8. Staff

```sql
CREATE TYPE staff_role AS ENUM (
  'carer', 'senior_carer', 'nurse', 'activities_coordinator',
  'home_manager', 'registered_manager', 'chef', 'maintenance',
  'finance_admin', 'administrator', 'group_admin'
);
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'bank', 'agency', 'volunteer');
CREATE TYPE staff_status AS ENUM ('active', 'on_leave', 'sick', 'suspended', 'terminated');

CREATE TABLE staff (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         UUID NOT NULL REFERENCES organisations(id),
  home_id                 UUID NOT NULL REFERENCES homes(id),
  user_id                 UUID UNIQUE,           -- FK to users table (auth)

  full_name               VARCHAR(255) NOT NULL,
  preferred_name          VARCHAR(100),
  email                   VARCHAR(255) UNIQUE NOT NULL,
  phone                   VARCHAR(20),
  date_of_birth           DATE,
  address                 TEXT,
  national_insurance_no   VARCHAR(10),           -- encrypted at column level in prod

  role                    staff_role NOT NULL,
  employment_type         employment_type NOT NULL,
  contracted_hours_pw     DECIMAL(5, 2),
  start_date              DATE NOT NULL,
  end_date                DATE,
  status                  staff_status NOT NULL DEFAULT 'active',

  -- Compliance
  dbs_type                VARCHAR(50),           -- enhanced, standard, basic
  dbs_certificate_no      VARCHAR(20),
  dbs_issue_date          DATE,
  dbs_on_update_service   BOOLEAN NOT NULL DEFAULT FALSE,
  dbs_update_checked_date DATE,
  dbs_outcome             VARCHAR(20),           -- clear, conditions, barred

  right_to_work_checked   BOOLEAN NOT NULL DEFAULT FALSE,
  right_to_work_date      DATE,
  right_to_work_type      VARCHAR(50),

  -- Professional registration
  nmc_pin                 VARCHAR(20),           -- nurses only
  nmc_expiry              DATE,

  photo_s3_key            VARCHAR(500),
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_staff_home_id ON staff(home_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_organisation_id ON staff(organisation_id);
CREATE INDEX idx_staff_role ON staff(home_id, role) WHERE status = 'active';


-- ─────────────────────────────────────────────
-- STAFF TRAINING
-- ─────────────────────────────────────────────
CREATE TYPE training_type AS ENUM ('mandatory', 'recommended', 'specialist', 'induction');
CREATE TYPE training_status AS ENUM ('current', 'due', 'overdue', 'expired');

CREATE TABLE staff_training (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL REFERENCES staff(id),
  home_id         UUID NOT NULL REFERENCES homes(id),
  course_name     VARCHAR(255) NOT NULL,
  course_type     training_type NOT NULL DEFAULT 'mandatory',
  provider        VARCHAR(255),
  completed_date  DATE NOT NULL,
  expiry_date     DATE,
  certificate_s3_key VARCHAR(500),
  logged_by       UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_staff_id ON staff_training(staff_id);
CREATE INDEX idx_training_expiry ON staff_training(expiry_date) WHERE expiry_date IS NOT NULL;


-- ─────────────────────────────────────────────
-- SHIFTS & ROTA
-- ─────────────────────────────────────────────
CREATE TYPE shift_type AS ENUM ('early', 'late', 'night', 'split', 'custom');
CREATE TYPE shift_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'absent', 'cancelled');

CREATE TABLE shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id         UUID NOT NULL REFERENCES homes(id),
  staff_id        UUID NOT NULL REFERENCES staff(id),
  date            DATE NOT NULL,
  shift_type      shift_type NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  break_minutes   SMALLINT NOT NULL DEFAULT 30,
  role_on_shift   staff_role NOT NULL,
  is_agency       BOOLEAN NOT NULL DEFAULT FALSE,
  agency_name     VARCHAR(255),
  agency_rate     DECIMAL(8, 2),
  status          shift_status NOT NULL DEFAULT 'scheduled',
  notes           TEXT,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shifts_home_date ON shifts(home_id, date);
CREATE INDEX idx_shifts_staff_date ON shifts(staff_id, date);


-- ─────────────────────────────────────────────
-- ATTENDANCE (Clock in/out)
-- ─────────────────────────────────────────────
CREATE TYPE clock_method AS ENUM ('pin', 'qr_code', 'nfc', 'manual', 'biometric');

CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id        UUID NOT NULL REFERENCES shifts(id),
  staff_id        UUID NOT NULL REFERENCES staff(id),
  clocked_in_at   TIMESTAMPTZ,
  clock_in_method clock_method,
  clocked_out_at  TIMESTAMPTZ,
  clock_out_method clock_method,
  total_hours     DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN clocked_in_at IS NOT NULL AND clocked_out_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (clocked_out_at - clocked_in_at)) / 3600.0
    ELSE NULL END
  ) STORED,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason TEXT,
  approved_by     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_shift_id ON attendance(shift_id);
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, clocked_in_at::DATE);
```

---

## 9. Finance

```sql
CREATE TYPE contract_status AS ENUM ('active', 'terminated', 'suspended');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partial', 'overdue', 'void', 'written_off');
CREATE type payment_method AS ENUM ('bank_transfer', 'cheque', 'card', 'direct_debit', 'standing_order', 'la_bacs');

CREATE TABLE resident_contracts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id             UUID NOT NULL REFERENCES residents(id),
  home_id                 UUID NOT NULL REFERENCES homes(id),
  start_date              DATE NOT NULL,
  end_date                DATE,
  room_rate_weekly        DECIMAL(10, 2) NOT NULL,
  care_uplift_weekly      DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notice_period_days      SMALLINT NOT NULL DEFAULT 28,
  extras                  JSONB NOT NULL DEFAULT '[]',  -- [{description, rate, frequency}]
  status                  contract_status NOT NULL DEFAULT 'active',
  invoice_to_name         VARCHAR(255) NOT NULL,
  invoice_to_address      TEXT NOT NULL,
  invoice_to_email        VARCHAR(255),
  signed_date             DATE,
  document_s3_key         VARCHAR(500),
  notes                   TEXT,
  created_by              UUID NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_resident_id ON resident_contracts(resident_id);


CREATE TABLE funding_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  type            funding_source_type NOT NULL,
  funder_name     VARCHAR(255),                  -- LA name, NHS body
  funder_ref      VARCHAR(100),
  weekly_rate     DECIMAL(10, 2) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE,
  review_date     DATE,
  is_primary      BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funding_resident_id ON funding_sources(resident_id);


CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id             UUID NOT NULL REFERENCES homes(id),
  resident_id         UUID NOT NULL REFERENCES residents(id),
  contract_id         UUID NOT NULL REFERENCES resident_contracts(id),
  invoice_number      VARCHAR(30) UNIQUE NOT NULL,

  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE NOT NULL,

  subtotal            DECIMAL(10, 2) NOT NULL,
  tax_amount          DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- care is VAT exempt
  total_amount        DECIMAL(10, 2) NOT NULL,
  amount_paid         DECIMAL(10, 2) NOT NULL DEFAULT 0,
  balance_due         DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

  status              invoice_status NOT NULL DEFAULT 'draft',
  line_items          JSONB NOT NULL DEFAULT '[]',
  sent_at             TIMESTAMPTZ,
  sent_to             VARCHAR(255),
  notes               TEXT,

  created_by          UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_home_id ON invoices(home_id, period_start DESC);
CREATE INDEX idx_invoices_resident_id ON invoices(resident_id);
CREATE INDEX idx_invoices_status ON invoices(home_id, status);


CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  amount          DECIMAL(10, 2) NOT NULL,
  method          payment_method NOT NULL,
  reference       VARCHAR(255),
  received_date   DATE NOT NULL,
  notes           TEXT,
  recorded_by     UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
```

---

## 10. Inventory

```sql
CREATE TYPE inventory_category AS ENUM (
  'ppe', 'clinical_consumables', 'medication_stock', 'food_drink',
  'cleaning', 'laundry', 'equipment', 'office', 'activities'
);
CREATE TYPE inventory_status AS ENUM ('ok', 'low', 'critical', 'out_of_stock', 'discontinued');

CREATE TABLE inventory_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id                 UUID NOT NULL REFERENCES homes(id),
  name                    VARCHAR(255) NOT NULL,
  sku                     VARCHAR(100),
  category                inventory_category NOT NULL,
  unit                    VARCHAR(50) NOT NULL,           -- box, each, litre, kg
  quantity_on_hand        DECIMAL(10, 2) NOT NULL DEFAULT 0,
  par_level               DECIMAL(10, 2) NOT NULL,       -- ideal stock level
  reorder_point           DECIMAL(10, 2) NOT NULL,       -- trigger reorder
  reorder_quantity        DECIMAL(10, 2),
  unit_cost               DECIMAL(10, 2),
  preferred_supplier_id   UUID,
  status                  inventory_status NOT NULL DEFAULT 'ok',
  last_restocked          TIMESTAMPTZ,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_home_id ON inventory_items(home_id);
CREATE INDEX idx_inventory_status ON inventory_items(home_id, status);


CREATE TABLE inventory_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES inventory_items(id),
  home_id         UUID NOT NULL REFERENCES homes(id),
  type            VARCHAR(50) NOT NULL,                  -- restock, usage, waste, transfer, correction
  quantity_change DECIMAL(10, 2) NOT NULL,
  quantity_after  DECIMAL(10, 2) NOT NULL,
  po_id           UUID,
  notes           TEXT,
  recorded_by     UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TYPE po_status AS ENUM ('draft', 'sent', 'partially_received', 'received', 'cancelled');

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id         UUID NOT NULL REFERENCES homes(id),
  po_number       VARCHAR(30) UNIQUE NOT NULL,
  supplier_id     UUID NOT NULL,
  status          po_status NOT NULL DEFAULT 'draft',
  items           JSONB NOT NULL DEFAULT '[]',    -- [{item_id, description, quantity, unit_cost}]
  total_amount    DECIMAL(10, 2) NOT NULL,
  raised_by       UUID NOT NULL,
  raised_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  expected_delivery DATE,
  received_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 11. Compliance & CQC

```sql
CREATE TYPE audit_type AS ENUM (
  'medication', 'care_plan', 'environment', 'health_safety',
  'infection_control', 'mca_dols', 'safeguarding', 'staff_files',
  'call_bell_response', 'moving_handling'
);

CREATE TABLE compliance_audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id         UUID NOT NULL REFERENCES homes(id),
  audit_type      audit_type NOT NULL,
  date            DATE NOT NULL,
  conducted_by    UUID NOT NULL,
  score_pct       SMALLINT CHECK (score_pct BETWEEN 0 AND 100),
  findings        JSONB NOT NULL DEFAULT '[]',   -- [{question, answer, compliant, notes}]
  actions         JSONB NOT NULL DEFAULT '[]',   -- [{finding, action, assigned_to, due_date, completed_at}]
  overall_outcome VARCHAR(50),                   -- compliant, requires_improvement, non_compliant
  next_due_date   DATE,
  document_s3_key VARCHAR(500),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audits_home_id ON compliance_audits(home_id, date DESC);


CREATE TABLE cqc_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id             UUID NOT NULL REFERENCES homes(id),
  incident_id         UUID REFERENCES incidents(id),
  resident_id         UUID REFERENCES residents(id),
  notification_type   VARCHAR(100) NOT NULL,     -- unexpected_death, abuse, serious_injury, etc.
  description         TEXT NOT NULL,
  submitted_at        TIMESTAMPTZ,
  submitted_by        UUID,
  cqc_reference       VARCHAR(100),
  acknowledgement_received BOOLEAN NOT NULL DEFAULT FALSE,
  status              VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 12. Documents

```sql
CREATE TYPE document_type AS ENUM (
  'care_plan', 'risk_assessment', 'incident_report', 'consent_form',
  'dnar', 'lpa', 'dols', 'mca_assessment', 'advance_care_plan',
  'contract', 'invoice', 'id_document', 'medical_letter',
  'discharge_summary', 'training_certificate', 'policy', 'other'
);

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id         UUID NOT NULL REFERENCES homes(id),
  resident_id     UUID REFERENCES residents(id),
  staff_id        UUID REFERENCES staff(id),
  type            document_type NOT NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  s3_key          VARCHAR(500) NOT NULL,
  filename        VARCHAR(255) NOT NULL,
  content_type    VARCHAR(100),
  size_bytes      INTEGER,
  version         SMALLINT NOT NULL DEFAULT 1,
  is_current      BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by     UUID NOT NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      DATE,
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_documents_resident_id ON documents(resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX idx_documents_home_type ON documents(home_id, type);
```

---

## 13. Users & Auth

```sql
CREATE TYPE user_role AS ENUM (
  'platform_admin', 'group_admin', 'home_manager', 'registered_manager',
  'senior_carer', 'carer', 'nurse', 'finance_admin', 'family_member', 'gp_external'
);

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  full_name           VARCHAR(255) NOT NULL,
  role                user_role NOT NULL,
  organisation_id     UUID REFERENCES organisations(id),
  home_ids            UUID[] NOT NULL DEFAULT '{}',
  staff_id            UUID UNIQUE REFERENCES staff(id),
  resident_id         UUID REFERENCES residents(id),  -- for family portal users

  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret          VARCHAR(255),               -- encrypted TOTP secret
  last_login_at       TIMESTAMPTZ,
  last_login_ip       VARCHAR(45),
  failed_login_count  SMALLINT NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organisation ON users(organisation_id) WHERE organisation_id IS NOT NULL;
```

---

## 14. Audit & GDPR Logs

```sql
-- Append-only — no UPDATE or DELETE ever on this table
-- Separate tablespace in production for immutability guarantees
CREATE TABLE audit_logs (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organisation_id UUID,
  home_id         UUID,
  user_id         UUID,
  ip_address      VARCHAR(45),
  resource_type   VARCHAR(100) NOT NULL,
  resource_id     UUID,
  action          VARCHAR(20) NOT NULL,           -- INSERT, UPDATE, DELETE, VIEW
  before_state    JSONB,
  after_state     JSONB,
  context         JSONB DEFAULT '{}'              -- request_id, session_id, etc.
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- (create via automated monthly job)

CREATE INDEX idx_audit_logs_home_created ON audit_logs(home_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);

-- Revoke UPDATE and DELETE even from superuser (use event trigger in prod)
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;


CREATE TABLE gdpr_access_logs (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organisation_id UUID,
  home_id         UUID,
  user_id         UUID NOT NULL,
  resident_id     UUID,
  action          VARCHAR(100) NOT NULL,          -- viewed_record, exported_data, sar_request
  resource_type   VARCHAR(100),
  resource_id     UUID,
  purpose         TEXT,                           -- why accessed (if justification required)
  ip_address      VARCHAR(45)
) PARTITION BY RANGE (created_at);
```

---

## 15. Notifications

```sql
CREATE TYPE notification_type AS ENUM ('alert', 'task', 'message', 'system', 'reminder');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  home_id         UUID REFERENCES homes(id),
  type            notification_type NOT NULL,
  priority        notification_priority NOT NULL DEFAULT 'medium',
  title           VARCHAR(500) NOT NULL,
  body            TEXT,
  action_url      VARCHAR(500),
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
  WHERE read = FALSE;
```

---

## 16. Row-Level Security Policies

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
-- (apply to all tenant tables)

-- Application role (service account — not superuser)
CREATE ROLE carecore_app;

-- RLS policy: app role can only see rows for current home
CREATE POLICY home_isolation ON residents
  FOR ALL TO carecore_app
  USING (home_id = current_setting('app.current_home_id')::uuid);

-- Group admin can see all homes in org
CREATE POLICY org_isolation ON residents
  FOR ALL TO carecore_app
  USING (
    home_id = current_setting('app.current_home_id')::uuid
    OR organisation_id = current_setting('app.current_org_id')::uuid
      AND current_setting('app.current_role') IN ('group_admin', 'platform_admin')
  );

-- Family portal: only own resident
CREATE POLICY family_isolation ON residents
  FOR SELECT TO carecore_app
  USING (
    id = current_setting('app.current_resident_id', true)::uuid
    AND current_setting('app.current_role') = 'family_member'
  );

-- Finance data: only finance_admin and above
CREATE POLICY finance_isolation ON invoices
  FOR ALL TO carecore_app
  USING (
    home_id = current_setting('app.current_home_id')::uuid
    AND current_setting('app.current_role') IN (
      'finance_admin', 'home_manager', 'registered_manager', 'group_admin', 'platform_admin'
    )
  );
```

---

## 17. Key Indexes Summary

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_mar_today_overdue ON mar_entries(home_id, scheduled_time)
  WHERE administered_at IS NULL
  AND scheduled_time < NOW();

CREATE INDEX idx_residents_active_home ON residents(home_id, room_id)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX idx_dols_expiring ON dols_records(home_id, expiry_date)
  WHERE outcome = 'granted' AND expiry_date < NOW() + INTERVAL '60 days';

CREATE INDEX idx_training_expiring ON staff_training(home_id, expiry_date)
  WHERE expiry_date < NOW() + INTERVAL '90 days';

CREATE INDEX idx_incidents_open ON incidents(home_id, occurred_at DESC)
  WHERE status IN ('open', 'under_review');
```

---

## 18. TimescaleDB Schema (IoT / Vitals DB)

```sql
-- Separate database: carecore_timeseries
-- For high-frequency IoT sensor data

CREATE TABLE iot_readings (
  time            TIMESTAMPTZ NOT NULL,
  device_id       UUID NOT NULL,
  home_id         UUID NOT NULL,
  resident_id     UUID,
  reading_type    VARCHAR(50) NOT NULL,          -- heart_rate, o2_sat, skin_temp, motion, bed_exit
  value           JSONB NOT NULL,
  alert_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload     JSONB
);

SELECT create_hypertable('iot_readings', 'time');

CREATE INDEX idx_iot_device_time ON iot_readings(device_id, time DESC);
CREATE INDEX idx_iot_resident_type ON iot_readings(resident_id, reading_type, time DESC)
  WHERE resident_id IS NOT NULL;

-- Compression policy (compress chunks older than 7 days)
SELECT add_compression_policy('iot_readings', INTERVAL '7 days');

-- Retention policy (keep 2 years, then drop — archived to S3 Glacier)
SELECT add_retention_policy('iot_readings', INTERVAL '2 years');


-- IoT device alerts (separate table — lower volume, higher importance)
CREATE TABLE iot_alerts (
  time            TIMESTAMPTZ NOT NULL,
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  device_id       UUID NOT NULL,
  home_id         UUID NOT NULL,
  resident_id     UUID,
  alert_type      VARCHAR(50) NOT NULL,          -- fall, vital_critical, door_open, call_bell
  severity        VARCHAR(20) NOT NULL,
  payload         JSONB NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID,
  outcome         VARCHAR(50),
  incident_id     UUID,
  response_time_s INTEGER GENERATED ALWAYS AS (
    CASE WHEN acknowledged_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (acknowledged_at - time))::INTEGER
    ELSE NULL END
  ) STORED
);

SELECT create_hypertable('iot_alerts', 'time');
```

---

*Schema version: 1.0*
*Target: PostgreSQL 16 with TimescaleDB 2.x*
*Migrations managed via Prisma Migrate*
