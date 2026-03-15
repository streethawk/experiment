import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Fixed IDs ────────────────────────────────────────────────────────────────
const ORG_ID   = '00000000-0000-0000-0000-000000000001';
const HOME_ID  = '00000000-0000-0000-0000-000000000002';
const WING_ID  = '00000000-0000-0000-0000-000000000003';

const USER_MANAGER = '00000000-0000-0000-0000-000000000010';
const USER_CARER   = '00000000-0000-0000-0000-000000000011';
const USER_NURSE   = '00000000-0000-0000-0000-000000000012';

const STAFF_MANAGER = '00000000-0000-0000-0000-000000000030';
const STAFF_CARER   = '00000000-0000-0000-0000-000000000031';
const STAFF_NURSE   = '00000000-0000-0000-0000-000000000032';
const STAFF_LUCY    = '00000000-0000-0000-0000-000000000033';

const R_EDITH    = '00000000-0000-0000-0000-000000000020';
const R_ARTHUR   = '00000000-0000-0000-0000-000000000021';
const R_MARGARET = '00000000-0000-0000-0000-000000000022';
const R_WILLIAM  = '00000000-0000-0000-0000-000000000023';
const R_DOROTHY  = '00000000-0000-0000-0000-000000000024';

const MED_AMLODIPINE  = '00000000-0000-0000-0000-000000000040';
const MED_PARACETAMOL = '00000000-0000-0000-0000-000000000041';
const MED_DONEPEZIL   = '00000000-0000-0000-0000-000000000042';
const MED_LORAZEPAM   = '00000000-0000-0000-0000-000000000043';
const MED_MORPHINE    = '00000000-0000-0000-0000-000000000044';
const MED_FUROSEMIDE  = '00000000-0000-0000-0000-000000000045';
const MED_ATORVA      = '00000000-0000-0000-0000-000000000046';
const MED_MEMANTINE   = '00000000-0000-0000-0000-000000000047';

// ─── Date helpers (anchored to 2026-03-15) ────────────────────────────────────
const daysAgo = (n: number) => new Date(Date.UTC(2026, 2, 15 - n));
const daysAhead = (n: number) => new Date(Date.UTC(2026, 2, 15 + n));
const dt = (daysBack: number, h: number, m = 0) =>
  new Date(Date.UTC(2026, 2, 15 - daysBack, h, m));
const timeOnly = (h: number, m = 0) => new Date(Date.UTC(1970, 0, 1, h, m));

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding database…\n');

  // ── Step 1: Core entities (upsert by fixed ID) ────────────────────────────

  const org = await prisma.organisation.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'CareCore Demo Group',
      type: 'care_group',
      subscriptionTier: 'professional',
      billingEmail: 'admin@carecore.demo',
    },
  });
  console.log(`✓ Organisation: ${org.name}`);

  const home = await prisma.home.upsert({
    where: { id: HOME_ID },
    update: {},
    create: {
      id: HOME_ID,
      organisationId: ORG_ID,
      name: 'Sunrise Care Home',
      cqcRegistrationNumber: 'CQC-DEMO-001',
      addressLine1: '1 Demo Lane',
      city: 'London',
      postcode: 'SW1A 1AA',
      phone: '02012345678',
      email: 'sunrise@carecore.demo',
      bedCapacity: 40,
      careTypes: ['residential', 'dementia'],
      lastCqcRating: 'good',
    },
  });
  console.log(`✓ Home: ${home.name}`);

  await prisma.wing.upsert({
    where: { id: WING_ID },
    update: {},
    create: { id: WING_ID, homeId: HOME_ID, name: 'Main Wing', floor: 1 },
  });
  console.log('✓ Wing: Main Wing');

  // ── Step 2: Users ─────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password1!', 12);

  const userDefs = [
    { id: USER_MANAGER, email: 'manager@carecore.demo', fullName: 'Sarah Manager',     role: 'home_manager' as const },
    { id: USER_CARER,   email: 'carer@carecore.demo',   fullName: 'James Carer',       role: 'carer'        as const },
    { id: USER_NURSE,   email: 'nurse@carecore.demo',   fullName: 'Dr. Priya Nurse',   role: 'nurse'        as const },
  ];

  for (const u of userDefs) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { ...u, passwordHash, organisationId: ORG_ID, homeIds: [HOME_ID], isActive: true },
    });
    console.log(`✓ User: ${u.email}  (${u.role})`);
  }

  // ── Step 3: Staff ─────────────────────────────────────────────────────────
  const staffDefs = [
    {
      id: STAFF_MANAGER, userId: USER_MANAGER,
      fullName: 'Sarah Manager', email: 'manager@carecore.demo',
      role: 'home_manager' as const, employmentType: 'full_time' as const,
      startDate: new Date('2020-01-01'), contractedHoursPw: 37.5,
    },
    {
      id: STAFF_CARER, userId: USER_CARER,
      fullName: 'James Carer', email: 'carer@carecore.demo',
      role: 'carer' as const, employmentType: 'full_time' as const,
      startDate: new Date('2021-06-01'), contractedHoursPw: 37.5,
    },
    {
      id: STAFF_NURSE, userId: USER_NURSE,
      fullName: 'Dr. Priya Nurse', email: 'nurse@carecore.demo',
      role: 'nurse' as const, employmentType: 'full_time' as const,
      startDate: new Date('2019-09-01'), contractedHoursPw: 37.5,
      nmcPin: 'NMC123456', nmcExpiry: new Date('2027-01-01'),
    },
    {
      id: STAFF_LUCY,
      fullName: 'Lucy Banks', email: 'lucy.banks@carecore.demo',
      role: 'senior_carer' as const, employmentType: 'part_time' as const,
      startDate: new Date('2022-03-15'), contractedHoursPw: 24,
    },
  ];

  for (const s of staffDefs) {
    await prisma.staff.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, organisationId: ORG_ID, homeId: HOME_ID },
    });
    console.log(`✓ Staff: ${s.fullName}`);
  }

  // ── Step 4: Rooms ─────────────────────────────────────────────────────────
  const roomIds = Array.from({ length: 8 }, (_, i) =>
    `00000000-0000-0000-0000-0000000001${String(i + 1).padStart(2, '0')}`
  );

  for (let i = 0; i < 8; i++) {
    await prisma.room.upsert({
      where: { id: roomIds[i] },
      update: {},
      create: {
        id: roomIds[i],
        homeId: HOME_ID, wingId: WING_ID,
        roomNumber: `10${i + 1}`,
        roomType: i < 6 ? 'single' : 'ensuite',
        floor: 1,
      },
    });
  }
  console.log(`✓ Rooms: 8 created`);

  // ── Step 5: Residents ─────────────────────────────────────────────────────
  const residentDefs = [
    {
      id: R_EDITH, homeId: HOME_ID, organisationId: ORG_ID, roomId: roomIds[0],
      fullName: 'Edith Thompson', preferredName: 'Edie',
      dateOfBirth: new Date('1938-03-12'), gender: 'female' as const,
      nhsNumber: '1234567890', gpName: 'Dr. Smith',
      gpPractice: 'Elm Street Surgery', gpPhone: '02012340001',
      careType: 'residential' as const, admissionDate: new Date('2023-01-15'),
      admissionSource: 'hospital_discharge' as const,
      primaryFundingSource: 'self_funded' as const, status: 'active' as const,
      keyworkerId: USER_CARER,
    },
    {
      id: R_ARTHUR, homeId: HOME_ID, organisationId: ORG_ID, roomId: roomIds[1],
      fullName: 'Arthur Pemberton',
      dateOfBirth: new Date('1932-07-04'), gender: 'male' as const,
      nhsNumber: '2345678901', gpName: 'Dr. Patel',
      gpPractice: 'Oak Avenue Practice', gpPhone: '02012340002',
      careType: 'dementia' as const, admissionDate: new Date('2022-06-20'),
      admissionSource: 'home' as const,
      primaryFundingSource: 'local_authority' as const, status: 'active' as const,
      mcaLacksCapacity: true, keyworkerId: USER_NURSE,
    },
    {
      id: R_MARGARET, homeId: HOME_ID, organisationId: ORG_ID, roomId: roomIds[2],
      fullName: 'Margaret Collins', preferredName: 'Maggie',
      dateOfBirth: new Date('1940-11-28'), gender: 'female' as const,
      nhsNumber: '3456789012', gpName: 'Dr. Johnson',
      gpPractice: 'Pine Road Clinic', gpPhone: '02012340003',
      careType: 'residential' as const, admissionDate: new Date('2024-02-10'),
      admissionSource: 'self_referral' as const,
      primaryFundingSource: 'self_funded' as const, status: 'active' as const,
      keyworkerId: USER_CARER,
    },
    {
      id: R_WILLIAM, homeId: HOME_ID, organisationId: ORG_ID, roomId: roomIds[3],
      fullName: 'William Foster',
      dateOfBirth: new Date('1935-05-19'), gender: 'male' as const,
      nhsNumber: '4567890123', gpName: 'Dr. Roberts',
      gpPractice: 'Birch Lane Surgery', gpPhone: '02012340004',
      careType: 'nursing' as const, admissionDate: new Date('2021-11-03'),
      admissionSource: 'hospital_discharge' as const,
      primaryFundingSource: 'chc' as const, status: 'active' as const,
      dnarInPlace: true, dnarSignedDate: new Date('2022-01-10'),
      keyworkerId: USER_NURSE,
    },
    {
      id: R_DOROTHY, homeId: HOME_ID, organisationId: ORG_ID, roomId: roomIds[4],
      fullName: 'Dorothy Walsh', preferredName: 'Dot',
      dateOfBirth: new Date('1943-08-30'), gender: 'female' as const,
      nhsNumber: '5678901234', gpName: 'Dr. Ahmed',
      gpPractice: 'Maple Square Medical', gpPhone: '02012340005',
      careType: 'dementia' as const, admissionDate: new Date('2023-09-22'),
      admissionSource: 'la_referral' as const,
      primaryFundingSource: 'local_authority' as const, status: 'active' as const,
      mcaLacksCapacity: true, keyworkerId: USER_CARER,
    },
  ];

  for (const r of residentDefs) {
    await prisma.resident.upsert({ where: { id: r.id }, update: {}, create: r });
    console.log(`✓ Resident: ${r.fullName}`);
  }

  const allResidentIds = [R_EDITH, R_ARTHUR, R_MARGARET, R_WILLIAM, R_DOROTHY];

  // ── Step 6: Clean up re-runnable dependent data ───────────────────────────
  console.log('\nCleaning previous dependent data…');
  await prisma.marEntry.deleteMany({ where: { homeId: HOME_ID } });
  await prisma.careNote.deleteMany({ where: { homeId: HOME_ID } });
  await prisma.woundAssessment.deleteMany({ where: { wound: { residentId: { in: allResidentIds } } } });
  await prisma.wound.deleteMany({ where: { residentId: { in: allResidentIds } } });
  await prisma.incident.deleteMany({ where: { homeId: HOME_ID } });
  await prisma.shift.deleteMany({ where: { homeId: HOME_ID } });
  await prisma.allergy.deleteMany({ where: { residentId: { in: allResidentIds } } });
  await prisma.residentContact.deleteMany({ where: { residentId: { in: allResidentIds } } });
  await prisma.riskAssessment.deleteMany({ where: { homeId: HOME_ID } });
  await prisma.carePlan.deleteMany({ where: { homeId: HOME_ID } });

  // ── Step 7: Medications (upsert) ──────────────────────────────────────────
  const medDefs = [
    {
      id: MED_AMLODIPINE,
      residentId: R_EDITH, homeId: HOME_ID,
      drugName: 'Amlodipine', form: 'Tablet', strength: '5mg', dose: '5mg once daily',
      route: 'oral' as const, frequency: 'once_daily' as const,
      times: [timeOnly(8)], indication: 'Hypertension',
      isPrn: false, isControlledDrug: false,
      prescribedBy: 'Dr. Smith', prescribedDate: new Date('2023-02-01'),
      stockOnHand: 28, status: 'active' as const, createdBy: USER_NURSE,
    },
    {
      id: MED_PARACETAMOL,
      residentId: R_EDITH, homeId: HOME_ID,
      drugName: 'Paracetamol', form: 'Tablet', strength: '500mg', dose: '1–2 tablets up to 4 times daily',
      route: 'oral' as const, frequency: 'when_required' as const,
      times: [], indication: 'Pain relief',
      isPrn: true, prnCriteria: 'Pain score ≥ 4/10 or at resident request',
      isControlledDrug: false,
      prescribedBy: 'Dr. Smith', prescribedDate: new Date('2023-02-01'),
      stockOnHand: 56, status: 'active' as const, createdBy: USER_NURSE,
    },
    {
      id: MED_DONEPEZIL,
      residentId: R_ARTHUR, homeId: HOME_ID,
      drugName: 'Donepezil', form: 'Tablet', strength: '10mg', dose: '10mg at night',
      route: 'oral' as const, frequency: 'once_daily' as const,
      times: [timeOnly(22)], indication: "Alzheimer's dementia",
      isPrn: false, isControlledDrug: false,
      prescribedBy: 'Dr. Patel', prescribedDate: new Date('2022-07-01'),
      stockOnHand: 30, status: 'active' as const, createdBy: USER_NURSE,
    },
    {
      id: MED_LORAZEPAM,
      residentId: R_ARTHUR, homeId: HOME_ID,
      drugName: 'Lorazepam', form: 'Tablet', strength: '0.5mg', dose: '0.5mg at night when required',
      route: 'oral' as const, frequency: 'when_required' as const,
      times: [], indication: 'Agitation / anxiety',
      isPrn: true, prnCriteria: 'Visible distress or agitation not responsive to reassurance',
      isControlledDrug: true, controlledDrugSchedule: 4,
      prescribedBy: 'Dr. Patel', prescribedDate: new Date('2023-01-15'),
      stockOnHand: 14, status: 'active' as const, createdBy: USER_NURSE,
    },
    {
      id: MED_MORPHINE,
      residentId: R_WILLIAM, homeId: HOME_ID,
      drugName: 'Morphine Sulphate MR', form: 'Tablet', strength: '10mg', dose: '10mg twice daily',
      route: 'oral' as const, frequency: 'twice_daily' as const,
      times: [timeOnly(8), timeOnly(20)], indication: 'Chronic pain management',
      isPrn: false, isControlledDrug: true, controlledDrugSchedule: 2,
      prescribedBy: 'Dr. Roberts', prescribedDate: new Date('2022-01-05'),
      stockOnHand: 42, status: 'active' as const, createdBy: USER_NURSE,
    },
    {
      id: MED_FUROSEMIDE,
      residentId: R_WILLIAM, homeId: HOME_ID,
      drugName: 'Furosemide', form: 'Tablet', strength: '40mg', dose: '40mg in the morning',
      route: 'oral' as const, frequency: 'once_daily' as const,
      times: [timeOnly(8)], indication: 'Heart failure / oedema',
      isPrn: false, isControlledDrug: false,
      prescribedBy: 'Dr. Roberts', prescribedDate: new Date('2021-12-01'),
      stockOnHand: 28, status: 'active' as const, createdBy: USER_NURSE,
    },
    {
      id: MED_ATORVA,
      residentId: R_MARGARET, homeId: HOME_ID,
      drugName: 'Atorvastatin', form: 'Tablet', strength: '20mg', dose: '20mg at night',
      route: 'oral' as const, frequency: 'once_daily' as const,
      times: [timeOnly(22)], indication: 'Hyperlipidaemia',
      isPrn: false, isControlledDrug: false,
      prescribedBy: 'Dr. Johnson', prescribedDate: new Date('2024-03-01'),
      stockOnHand: 28, status: 'active' as const, createdBy: USER_NURSE,
    },
    {
      id: MED_MEMANTINE,
      residentId: R_DOROTHY, homeId: HOME_ID,
      drugName: 'Memantine', form: 'Tablet', strength: '20mg', dose: '20mg once daily',
      route: 'oral' as const, frequency: 'once_daily' as const,
      times: [timeOnly(8)], indication: "Moderate-to-severe Alzheimer's dementia",
      isPrn: false, isControlledDrug: false,
      prescribedBy: 'Dr. Ahmed', prescribedDate: new Date('2023-10-01'),
      stockOnHand: 28, status: 'active' as const, createdBy: USER_NURSE,
    },
  ];

  for (const m of medDefs) {
    await prisma.medication.upsert({ where: { id: m.id }, update: {}, create: m });
  }
  console.log(`✓ Medications: ${medDefs.length} created`);

  // ── Step 8: MAR entries (7 days history) ─────────────────────────────────
  const regularMeds = [
    { medId: MED_AMLODIPINE,  residentId: R_EDITH,    hour: 8,  adminBy: USER_CARER },
    { medId: MED_DONEPEZIL,   residentId: R_ARTHUR,   hour: 22, adminBy: USER_NURSE },
    { medId: MED_MORPHINE,    residentId: R_WILLIAM,  hour: 8,  adminBy: USER_NURSE },
    { medId: MED_MORPHINE,    residentId: R_WILLIAM,  hour: 20, adminBy: USER_NURSE },
    { medId: MED_FUROSEMIDE,  residentId: R_WILLIAM,  hour: 8,  adminBy: USER_NURSE },
    { medId: MED_ATORVA,      residentId: R_MARGARET, hour: 22, adminBy: USER_CARER },
    { medId: MED_MEMANTINE,   residentId: R_DOROTHY,  hour: 8,  adminBy: USER_CARER },
  ];

  const marEntries: any[] = [];

  for (let daysBack = 7; daysBack >= 1; daysBack--) {
    for (const med of regularMeds) {
      const scheduledTime = dt(daysBack, med.hour);
      // Occasional refused / not_available for realism
      let outcome: string = 'given';
      let notes: string | null = null;
      if (daysBack === 5 && med.residentId === R_ARTHUR && med.hour === 22) {
        outcome = 'refused';
        notes = 'Resident refused, saying he did not want medication tonight';
      } else if (daysBack === 3 && med.residentId === R_WILLIAM && med.hour === 20) {
        outcome = 'not_available';
        notes = 'Stock not available — pharmacy order pending';
      }
      marEntries.push({
        medicationId: med.medId,
        residentId: med.residentId,
        homeId: HOME_ID,
        scheduledTime,
        administeredAt: outcome === 'given' ? new Date(scheduledTime.getTime() + 8 * 60000) : null,
        outcome,
        administeredBy: med.adminBy,
        notes,
        isPrn: false,
      });
    }
  }

  // PRN administrations
  marEntries.push(
    {
      medicationId: MED_PARACETAMOL, residentId: R_EDITH, homeId: HOME_ID,
      scheduledTime: dt(3, 14), administeredAt: dt(3, 14, 5),
      outcome: 'given', administeredBy: USER_CARER,
      isPrn: true, prnIndication: 'Reported right hip pain score 6/10',
    },
    {
      medicationId: MED_PARACETAMOL, residentId: R_EDITH, homeId: HOME_ID,
      scheduledTime: dt(1, 9), administeredAt: dt(1, 9, 3),
      outcome: 'given', administeredBy: USER_CARER,
      isPrn: true, prnIndication: 'Hip pain 5/10 on waking',
    },
    {
      medicationId: MED_LORAZEPAM, residentId: R_ARTHUR, homeId: HOME_ID,
      scheduledTime: dt(2, 21), administeredAt: dt(2, 21, 10),
      outcome: 'given', administeredBy: USER_NURSE,
      isPrn: true, prnIndication: 'Severe agitation — shouting and attempting to leave',
      notes: 'Witnessed by Lucy Banks (STAFF_LUCY). Settled within 30 minutes.',
    },
  );

  for (const entry of marEntries) {
    await prisma.marEntry.create({ data: entry });
  }
  console.log(`✓ MAR entries: ${marEntries.length} created`);

  // ── Step 9: NOK contacts ──────────────────────────────────────────────────
  await prisma.residentContact.createMany({
    data: [
      { residentId: R_EDITH,    name: 'Robert Thompson',  relationship: 'Son',     phonePrimary: '07700900001', email: 'r.thompson@example.com',  isPrimaryNok: true,  hasLpaWelfare: true,  hasLpaFinance: true  },
      { residentId: R_ARTHUR,   name: 'Susan Pemberton',  relationship: 'Daughter', phonePrimary: '07700900002', email: 's.pemberton@example.com', isPrimaryNok: true,  hasLpaWelfare: true,  hasLpaFinance: false },
      { residentId: R_MARGARET, name: 'Peter Collins',    relationship: 'Husband',  phonePrimary: '07700900003', email: 'p.collins@example.com',   isPrimaryNok: true,  hasLpaWelfare: false, hasLpaFinance: false },
      { residentId: R_WILLIAM,  name: 'Claire Foster',    relationship: 'Daughter', phonePrimary: '07700900004', email: 'c.foster@example.com',    isPrimaryNok: true,  hasLpaWelfare: true,  hasLpaFinance: true  },
      { residentId: R_DOROTHY,  name: 'Ian Walsh',        relationship: 'Son',      phonePrimary: '07700900005', email: 'i.walsh@example.com',     isPrimaryNok: true,  hasLpaWelfare: false, hasLpaFinance: false },
    ],
  });
  console.log('✓ NOK contacts: 5 created');

  // ── Step 10: Allergies ────────────────────────────────────────────────────
  await prisma.allergy.createMany({
    data: [
      { residentId: R_EDITH,   substance: 'Penicillin',    reaction: 'Anaphylaxis',               severity: 'life_threatening', recordedBy: USER_NURSE },
      { residentId: R_EDITH,   substance: 'Aspirin',       reaction: 'Gastrointestinal upset',    severity: 'moderate',         recordedBy: USER_NURSE },
      { residentId: R_ARTHUR,  substance: 'Latex',         reaction: 'Skin rash and itching',     severity: 'mild',             recordedBy: USER_NURSE },
      { residentId: R_WILLIAM, substance: 'Codeine',       reaction: 'Severe nausea and vomiting', severity: 'severe',          recordedBy: USER_NURSE },
      { residentId: R_DOROTHY, substance: 'Sulfonamides',  reaction: 'Rash',                      severity: 'moderate',         recordedBy: USER_NURSE },
    ],
  });
  console.log('✓ Allergies: 5 created');

  // ── Step 11: Care Plans ───────────────────────────────────────────────────
  const carePlanSections = {
    personal_care: {
      goals: 'Maintain independence in personal hygiene with appropriate level of prompting.',
      interventions: 'Staff to offer verbal prompts before assisting. Respect preferences and dignity at all times.',
    },
    mobility: {
      goals: 'Safe ambulation throughout the home, preventing falls.',
      interventions: 'Zimmer frame in use. Two-person assist for transfers. Non-slip footwear at all times.',
    },
    nutrition: {
      goals: 'Maintain adequate caloric and fluid intake to support health.',
      interventions: 'Offer small frequent meals. Monitor and record intake. Alert nurse if < 50% eaten.',
    },
    medication: {
      goals: 'All medications administered accurately and on time.',
      interventions: 'Nurse to administer controlled drugs. MAR charts reviewed weekly. Any refusals documented.',
    },
  };

  for (const residentId of allResidentIds) {
    await prisma.carePlan.create({
      data: {
        residentId, homeId: HOME_ID,
        status: 'current', version: 1,
        sections: carePlanSections,
        createdBy: USER_MANAGER,
        approvedBy: USER_MANAGER,
        approvedAt: new Date('2025-01-10'),
        nextReviewDate: new Date('2026-04-01'),
      },
    });
  }
  console.log('✓ Care plans: 5 created');

  // ── Step 12: Risk Assessments ─────────────────────────────────────────────
  await prisma.riskAssessment.createMany({
    data: [
      { residentId: R_EDITH,   homeId: HOME_ID, type: 'falls',     score: 14, riskLevel: 'high',      details: { tool: 'Morse Falls Scale', notes: 'History of falls. Zimmer frame required.' }, assessedBy: USER_NURSE, assessedAt: new Date('2026-01-15'), validUntil: new Date('2026-07-15') },
      { residentId: R_ARTHUR,  homeId: HOME_ID, type: 'falls',     score: 18, riskLevel: 'very_high', details: { tool: 'Morse Falls Scale', notes: 'Severe dementia. Wandering risk.' },           assessedBy: USER_NURSE, assessedAt: new Date('2026-01-20'), validUntil: new Date('2026-04-20') },
      { residentId: R_ARTHUR,  homeId: HOME_ID, type: 'waterlow',  score: 16, riskLevel: 'high',      details: { tool: 'Waterlow Scale', notes: 'At risk of pressure damage. Reposition 2-hourly.' }, assessedBy: USER_NURSE, assessedAt: new Date('2026-01-20'), validUntil: new Date('2026-04-20') },
      { residentId: R_WILLIAM, homeId: HOME_ID, type: 'must',      score: 2,  riskLevel: 'high',      details: { tool: 'MUST', notes: 'High nutritional risk. Fortified foods and supplements.' },   assessedBy: USER_NURSE, assessedAt: new Date('2026-02-01'), validUntil: new Date('2026-05-01') },
      { residentId: R_WILLIAM, homeId: HOME_ID, type: 'skin_integrity', score: 19, riskLevel: 'very_high', details: { tool: 'Waterlow', notes: 'Active pressure ulcer sacrum. Category 2.' },         assessedBy: USER_NURSE, assessedAt: new Date('2026-01-21'), validUntil: new Date('2026-04-21') },
      { residentId: R_DOROTHY, homeId: HOME_ID, type: 'behaviour', score: null, riskLevel: 'medium',  details: { triggers: 'Sundowning, unfamiliar faces', strategies: 'Calm reassurance, familiar music, low stimulation environment' }, assessedBy: USER_NURSE, assessedAt: new Date('2026-02-10'), validUntil: new Date('2026-05-10') },
    ],
  });
  console.log('✓ Risk assessments: 6 created');

  // ── Step 13: Care Notes ───────────────────────────────────────────────────
  const careNotes = [
    // Edith
    {
      residentId: R_EDITH, homeId: HOME_ID, shift: 'early' as const,
      categories: ['personal_care' as const, 'nutrition' as const],
      note: 'Edie had a good morning. Assisted with wash and dress — she chose her own clothes and was in excellent spirits. Ate approximately 80% of breakfast (porridge and toast). Reported mild stiffness in right hip but otherwise comfortable.',
      moodScore: 4, foodIntakePct: 80, fluidIntakeMl: 200,
      isFlagged: false, createdBy: USER_CARER, createdAt: dt(1, 10),
    },
    {
      residentId: R_EDITH, homeId: HOME_ID, shift: 'late' as const,
      categories: ['mobility' as const, 'social_activity' as const],
      note: 'Edie attended the afternoon quiz. Mobilised independently to lounge with zimmer frame. Appeared fatigued by 17:00. Light tea taken. Son Robert visited 15:00–16:30 — good interaction, resident happy.',
      moodScore: 4, foodIntakePct: 60, fluidIntakeMl: 300,
      isFlagged: false, createdBy: USER_CARER, createdAt: dt(1, 18),
    },
    {
      residentId: R_EDITH, homeId: HOME_ID, shift: 'early' as const,
      categories: ['medical' as const, 'medication' as const],
      note: 'Edith reported increased right hip pain on waking, score 6/10. PRN Paracetamol 1g administered at 14:05 — see MAR. Resident advised to rest. Hip not visibly swollen. Will monitor and contact GP if no improvement within 24 hours.',
      moodScore: 2, foodIntakePct: 50, fluidIntakeMl: 150,
      isFlagged: true, flagReason: 'Increased pain score — GP review may be required if no improvement',
      createdBy: USER_NURSE, createdAt: dt(3, 15),
    },
    // Arthur
    {
      residentId: R_ARTHUR, homeId: HOME_ID, shift: 'early' as const,
      categories: ['personal_care' as const, 'mood_behaviour' as const],
      note: 'Arthur settled overnight. This morning was initially confused about whereabouts — required gentle reorientation x3. Accepted personal care with prompting. Note: Donepezil refused at 22:00 yesterday — documented on MAR.',
      moodScore: 3, foodIntakePct: 60, fluidIntakeMl: 250,
      isFlagged: true, flagReason: 'Medication refused — documented on MAR',
      createdBy: USER_CARER, createdAt: dt(5, 9),
    },
    {
      residentId: R_ARTHUR, homeId: HOME_ID, shift: 'night' as const,
      categories: ['mood_behaviour' as const, 'medication' as const],
      note: 'Arthur became very agitated at 21:00, shouting and attempting to leave. Called nurse. Lorazepam 0.5mg administered by nurse at 21:10, witnessed by Lucy Banks. Settled after approximately 30 minutes. Slept from ~22:30. Checked hourly overnight — no further episodes.',
      moodScore: 1, foodIntakePct: 20, fluidIntakeMl: 100,
      isFlagged: true, flagReason: 'PRN controlled drug administered — significant agitation episode',
      createdBy: USER_NURSE, createdAt: dt(2, 22),
    },
    {
      residentId: R_ARTHUR, homeId: HOME_ID, shift: 'early' as const,
      categories: ['personal_care' as const, 'general' as const],
      note: 'Arthur slept well following last night\'s episode. This morning calm and cooperative. Accepted full personal care without resistance. Enjoyed porridge and tea at breakfast. Donepezil taken without issues this morning.',
      moodScore: 3, foodIntakePct: 70, fluidIntakeMl: 250,
      isFlagged: false, createdBy: USER_CARER, createdAt: dt(1, 10),
    },
    // Margaret
    {
      residentId: R_MARGARET, homeId: HOME_ID, shift: 'early' as const,
      categories: ['personal_care' as const, 'social_activity' as const],
      note: "Maggie had a pleasant morning. Independent with most personal care, requiring only verbal prompts for sequencing. Chatted with other residents at breakfast — very sociable. Looking forward to family visit later this week.",
      moodScore: 5, foodIntakePct: 90, fluidIntakeMl: 350,
      isFlagged: false, createdBy: USER_CARER, createdAt: dt(1, 11),
    },
    {
      residentId: R_MARGARET, homeId: HOME_ID, shift: 'late' as const,
      categories: ['hydration' as const, 'nutrition' as const],
      note: "Maggie's fluid intake was below target today (approx 800ml vs 1500ml target). Encouraged additional drinks throughout the afternoon — she accepted with prompting. Will monitor closely over next 24 hours. Alert nurse if pattern continues.",
      moodScore: 4, foodIntakePct: 75, fluidIntakeMl: 800,
      isFlagged: true, flagReason: 'Low fluid intake — monitor closely',
      createdBy: USER_CARER, createdAt: dt(2, 19),
    },
    // William
    {
      residentId: R_WILLIAM, homeId: HOME_ID, shift: 'early' as const,
      categories: ['medical' as const, 'medication' as const],
      note: "William's morning morphine and furosemide administered as prescribed. Pain score 3/10 — well controlled. Bilateral ankles slightly oedematous but improved since yesterday. Urine output noted as good overnight.",
      moodScore: 3, foodIntakePct: 70, fluidIntakeMl: 250,
      isFlagged: false, createdBy: USER_NURSE, createdAt: dt(1, 9),
    },
    {
      residentId: R_WILLIAM, homeId: HOME_ID, shift: 'late' as const,
      categories: ['medication' as const, 'medical' as const],
      note: "William's evening Morphine Sulphate MR was unavailable — pharmacy stock not replenished in time. Emergency order placed, delivery expected tomorrow morning. GP (Dr. Roberts) informed at 20:15. William reported pain 5/10 by 20:00. Repositioned for comfort, pressure-relieving mattress checked.",
      moodScore: 2, foodIntakePct: 50, fluidIntakeMl: 200,
      isFlagged: true, flagReason: 'Controlled drug not available — GP notified, emergency order placed',
      createdBy: USER_NURSE, createdAt: dt(3, 21),
    },
    {
      residentId: R_WILLIAM, homeId: HOME_ID, shift: 'early' as const,
      categories: ['wound_care' as const, 'medical' as const],
      note: 'Sacral wound (Category 2 pressure ulcer) assessed and redressed. Wound measuring 28×20mm, improved from last assessment. Granulation tissue present, minimal exudate. Mepilex Border reapplied. Repositioning chart maintained — 2-hourly turns confirmed overnight.',
      moodScore: 3, foodIntakePct: 65, fluidIntakeMl: 300,
      isFlagged: false, createdBy: USER_NURSE, createdAt: dt(3, 11),
    },
    // Dorothy
    {
      residentId: R_DOROTHY, homeId: HOME_ID, shift: 'early' as const,
      categories: ['personal_care' as const, 'mood_behaviour' as const],
      note: 'Dorothy (Dot) required full assistance with personal care this morning. Calm and cooperative throughout. Recognised key carer and smiled. Memantine administered with breakfast — taken without difficulty. Good mood, engaged in simple conversation.',
      moodScore: 4, foodIntakePct: 75, fluidIntakeMl: 300,
      isFlagged: false, createdBy: USER_CARER, createdAt: dt(1, 9),
    },
    {
      residentId: R_DOROTHY, homeId: HOME_ID, shift: 'late' as const,
      categories: ['mood_behaviour' as const, 'general' as const],
      note: 'Dorothy became more confused and restless from approximately 16:30 (sundowning). Remained in lounge with familiar music playing — this appeared to help. Accepted light tea with assistance. Settled gradually by 19:30. Night staff briefed to monitor.',
      moodScore: 2, foodIntakePct: 50, fluidIntakeMl: 200,
      isFlagged: false, createdBy: USER_CARER, createdAt: dt(1, 20),
    },
  ];

  for (const n of careNotes) {
    await prisma.careNote.create({ data: n });
  }
  console.log(`✓ Care notes: ${careNotes.length} created`);

  // ── Step 14: Wounds ───────────────────────────────────────────────────────
  const wound1 = await prisma.wound.create({
    data: {
      residentId: R_WILLIAM, site: 'Sacrum',
      onsetDate: new Date('2026-01-20'),
      woundType: 'Pressure ulcer — Category 2',
      status: 'healing', createdBy: USER_NURSE,
    },
  });
  await prisma.woundAssessment.createMany({
    data: [
      {
        woundId: wound1.id, assessedAt: dt(14, 10), assessedBy: USER_NURSE,
        lengthMm: 40, widthMm: 30, pushScore: 14,
        dressingUsed: 'Mepilex Border',
        nextChangeDate: daysAgo(11),
        notes: 'New pressure ulcer identified. Category 2. Referral to tissue viability nurse made. Pressure-relieving mattress requested.',
      },
      {
        woundId: wound1.id, assessedAt: dt(7, 10), assessedBy: USER_NURSE,
        lengthMm: 35, widthMm: 25, pushScore: 12,
        dressingUsed: 'Mepilex Border',
        nextChangeDate: daysAgo(4),
        notes: 'Wound edges showing signs of healing. Exudate reduced to moderate. Continue current management.',
      },
      {
        woundId: wound1.id, assessedAt: dt(3, 10), assessedBy: USER_NURSE,
        lengthMm: 28, widthMm: 20, pushScore: 9,
        dressingUsed: 'Mepilex Border',
        nextChangeDate: daysAhead(4),
        notes: 'Continued improvement. Granulation tissue clearly visible. Exudate minimal. PUSH score trending down well.',
      },
    ],
  });

  const wound2 = await prisma.wound.create({
    data: {
      residentId: R_EDITH, site: 'Right shin',
      onsetDate: new Date('2026-02-28'),
      woundType: 'Skin tear — Payne-Martin Type 1b',
      status: 'healing', createdBy: USER_NURSE,
    },
  });
  await prisma.woundAssessment.createMany({
    data: [
      {
        woundId: wound2.id, assessedAt: dt(4, 14), assessedBy: USER_NURSE,
        lengthMm: 25, widthMm: 12, pushScore: 6,
        dressingUsed: 'Mepitel One',
        nextChangeDate: daysAgo(1),
        notes: 'Skin tear from wheelchair footrest. Area cleaned with saline, dressed with Mepitel One. No signs of infection.',
      },
      {
        woundId: wound2.id, assessedAt: dt(1, 14), assessedBy: USER_NURSE,
        lengthMm: 20, widthMm: 10, pushScore: 4,
        dressingUsed: 'Mepitel One',
        nextChangeDate: daysAhead(3),
        notes: 'Good progress. Wound edges approximating well. No signs of infection. Continue dressing and monitor.',
      },
    ],
  });
  console.log('✓ Wounds: 2 wounds with assessments created');

  // ── Step 15: Rota shifts (past 7 days + next 7 days) ─────────────────────
  const shiftDefs: any[] = [];
  for (let daysBack = 7; daysBack >= 0; daysBack--) {
    const date = daysAgo(daysBack);
    const pastStatus = daysBack > 0 ? 'completed' : 'in_progress';
    shiftDefs.push(
      { homeId: HOME_ID, staffId: STAFF_CARER,   date, shiftType: 'early', startTime: timeOnly(7),  endTime: timeOnly(14), roleOnShift: 'carer',        breakMinutes: 30, status: pastStatus,   createdBy: USER_MANAGER },
      { homeId: HOME_ID, staffId: STAFF_LUCY,    date, shiftType: 'late',  startTime: timeOnly(14), endTime: timeOnly(22), roleOnShift: 'senior_carer', breakMinutes: 30, status: pastStatus,   createdBy: USER_MANAGER },
      { homeId: HOME_ID, staffId: STAFF_NURSE,   date, shiftType: 'night', startTime: timeOnly(22), endTime: timeOnly(7),  roleOnShift: 'nurse',        breakMinutes: 60, status: pastStatus,   createdBy: USER_MANAGER },
      { homeId: HOME_ID, staffId: STAFF_MANAGER, date, shiftType: 'early', startTime: timeOnly(8),  endTime: timeOnly(17), roleOnShift: 'home_manager', breakMinutes: 30, status: pastStatus,   createdBy: USER_MANAGER },
    );
  }
  for (let daysForward = 1; daysForward <= 7; daysForward++) {
    const date = daysAhead(daysForward);
    shiftDefs.push(
      { homeId: HOME_ID, staffId: STAFF_CARER,   date, shiftType: 'early', startTime: timeOnly(7),  endTime: timeOnly(14), roleOnShift: 'carer',        breakMinutes: 30, status: 'scheduled', createdBy: USER_MANAGER },
      { homeId: HOME_ID, staffId: STAFF_LUCY,    date, shiftType: 'late',  startTime: timeOnly(14), endTime: timeOnly(22), roleOnShift: 'senior_carer', breakMinutes: 30, status: 'scheduled', createdBy: USER_MANAGER },
      { homeId: HOME_ID, staffId: STAFF_NURSE,   date, shiftType: 'night', startTime: timeOnly(22), endTime: timeOnly(7),  roleOnShift: 'nurse',        breakMinutes: 60, status: 'scheduled', createdBy: USER_MANAGER },
      { homeId: HOME_ID, staffId: STAFF_MANAGER, date, shiftType: 'early', startTime: timeOnly(8),  endTime: timeOnly(17), roleOnShift: 'home_manager', breakMinutes: 30, status: 'scheduled', createdBy: USER_MANAGER },
    );
  }
  for (const s of shiftDefs) {
    await prisma.shift.create({ data: s });
  }
  console.log(`✓ Shifts: ${shiftDefs.length} created (past 7 days + next 7 days)`);

  // ── Step 16: Incidents ────────────────────────────────────────────────────
  await prisma.incident.createMany({
    data: [
      {
        homeId: HOME_ID, organisationId: ORG_ID,
        reference: 'INC-2026-001',
        type: 'fall', severity: 'medium', status: 'under_review',
        residentId: R_EDITH,
        occurredAt: dt(5, 10, 30),
        location: 'Bedroom 101',
        description: 'Resident found on the floor beside her bed at approximately 10:30. States she felt dizzy when getting up. No visible injury sustained. Vital signs stable throughout.',
        immediateActions: ['Nurse called immediately', 'Resident assisted back to armchair', 'Vital signs checked and documented', 'Family (son Robert) notified at 11:15'],
        injurySustained: false, familyNotified: true, gpNotified: true, cqcNotifiable: false,
        reportedBy: USER_CARER, actionsTaken: [],
      },
      {
        homeId: HOME_ID, organisationId: ORG_ID,
        reference: 'INC-2026-002',
        type: 'medication_error', severity: 'high', status: 'open',
        residentId: R_WILLIAM,
        occurredAt: dt(3, 20, 0),
        location: 'Medication room / Resident bedroom',
        description: "William's evening controlled drug (Morphine Sulphate MR 10mg) was unavailable due to stock not being replenished. Resident experienced uncontrolled pain (5/10) for approximately 2 hours.",
        immediateActions: ['GP contacted at 20:15', 'Emergency pharmacy supply requested', 'Resident monitored and repositioned for comfort', 'Pain score recorded hourly'],
        injurySustained: false, familyNotified: false, gpNotified: true, cqcNotifiable: false,
        rootCause: 'Stock ordering oversight — prescription not reordered within the standard 7-day window.',
        reportedBy: USER_NURSE, actionsTaken: [],
      },
      {
        homeId: HOME_ID, organisationId: ORG_ID,
        reference: 'INC-2026-003',
        type: 'near_miss', severity: 'low', status: 'closed',
        residentId: R_ARTHUR,
        occurredAt: dt(10, 3, 15),
        location: 'Corridor — Main Wing',
        description: 'Arthur found walking unsupported in the corridor at 03:15 without his zimmer frame. Returned safely to his room with night staff assistance. No fall occurred.',
        immediateActions: ['Resident safely escorted back to bedroom', 'Zimmer frame secured beside bed', 'Bed sensor alarm reviewed and repositioned'],
        injurySustained: false, familyNotified: false, gpNotified: false, cqcNotifiable: false,
        reportedBy: USER_NURSE, actionsTaken: [],
        closedAt: dt(9, 9),
      },
    ],
  });
  console.log('✓ Incidents: 3 created');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete.\n');
  console.log('─────────────────────────────────────────');
  console.log('Login credentials  (password: Password1!)');
  console.log('  manager@carecore.demo  — Home Manager');
  console.log('  carer@carecore.demo    — Care Assistant');
  console.log('  nurse@carecore.demo    — Nurse');
  console.log(`\nHome ID: ${HOME_ID}`);
  console.log('\nTest data:');
  console.log(`  • 5 residents (residential, dementia, nursing)`);
  console.log(`  • 4 staff members with user accounts`);
  console.log(`  • 8 medications (regular, PRN, controlled drugs)`);
  console.log(`  • ${marEntries.length} MAR entries (7-day history)`);
  console.log(`  • ${careNotes.length} care notes (some flagged)`);
  console.log(`  • 5 NOK contacts, 5 allergies`);
  console.log(`  • 5 care plans, 6 risk assessments`);
  console.log(`  • 2 wounds with assessments`);
  console.log(`  • ${shiftDefs.length} rota shifts (past 7 + next 7 days)`);
  console.log(`  • 3 incidents`);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
