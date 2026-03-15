import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database…');

  // ─── Organisation ──────────────────────────────────────────────────────────
  const org = await prisma.organisation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'CareCore Demo Group',
      type: 'care_group',
      subscriptionTier: 'professional',
      contactEmail: 'admin@carecore.demo',
    },
  });
  console.log(`✓ Organisation: ${org.name}`);

  // ─── Care Home ─────────────────────────────────────────────────────────────
  const home = await prisma.home.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organisationId: org.id,
      name: 'Sunrise Care Home',
      registrationNumber: 'CQC-DEMO-001',
      address: '1 Demo Lane',
      city: 'London',
      postcode: 'SW1A 1AA',
      phone: '02012345678',
      email: 'sunrise@carecore.demo',
      bedCapacity: 40,
      careTypes: ['residential', 'dementia'],
    },
  });
  console.log(`✓ Home: ${home.name}`);

  // ─── Users ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password1!', 12);

  const users = [
    {
      id:    '00000000-0000-0000-0000-000000000010',
      email: 'manager@carecore.demo',
      fullName: 'Sarah Manager',
      role: 'home_manager' as const,
    },
    {
      id:    '00000000-0000-0000-0000-000000000011',
      email: 'carer@carecore.demo',
      fullName: 'James Carer',
      role: 'carer' as const,
    },
    {
      id:    '00000000-0000-0000-0000-000000000012',
      email: 'nurse@carecore.demo',
      fullName: 'Dr. Priya Nurse',
      role: 'nurse' as const,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        ...u,
        passwordHash,
        organisationId: org.id,
        homeIds: [home.id],
        isActive: true,
      },
    });
    console.log(`✓ User: ${u.email}  (${u.role})`);
  }

  // ─── Rooms ─────────────────────────────────────────────────────────────────
  const rooms = Array.from({ length: 5 }, (_, i) => ({
    id: `00000000-0000-0000-0000-0000000001${String(i + 1).padStart(2, '0')}`,
    homeId: home.id,
    roomNumber: `10${i + 1}`,
    roomType: 'single' as const,
    floor: 1,
  }));

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
  }
  console.log(`✓ Rooms: ${rooms.length} created`);

  // ─── Residents ─────────────────────────────────────────────────────────────
  const residents = [
    {
      id: '00000000-0000-0000-0000-000000000020',
      homeId: home.id,
      roomId: rooms[0].id,
      fullName: 'Edith Thompson',
      dateOfBirth: new Date('1938-03-12'),
      careType: 'residential' as const,
      admissionDate: new Date('2023-01-15'),
      admissionSource: 'hospital_discharge' as const,
      primaryFundingSource: 'self_funded' as const,
      status: 'active' as const,
    },
    {
      id: '00000000-0000-0000-0000-000000000021',
      homeId: home.id,
      roomId: rooms[1].id,
      fullName: 'Arthur Pemberton',
      dateOfBirth: new Date('1932-07-04'),
      careType: 'dementia' as const,
      admissionDate: new Date('2022-06-20'),
      admissionSource: 'home' as const,
      primaryFundingSource: 'local_authority' as const,
      status: 'active' as const,
    },
    {
      id: '00000000-0000-0000-0000-000000000022',
      homeId: home.id,
      roomId: rooms[2].id,
      fullName: 'Margaret Collins',
      dateOfBirth: new Date('1940-11-28'),
      careType: 'residential' as const,
      admissionDate: new Date('2024-02-10'),
      admissionSource: 'self_referral' as const,
      primaryFundingSource: 'self_funded' as const,
      status: 'active' as const,
    },
  ];

  for (const r of residents) {
    await prisma.resident.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
    console.log(`✓ Resident: ${r.fullName}`);
  }

  console.log('\n✅ Seed complete.\n');
  console.log('Login credentials (all use password: Password1!)');
  console.log('  manager@carecore.demo  — Home Manager');
  console.log('  carer@carecore.demo    — Care Assistant');
  console.log('  nurse@carecore.demo    — Nurse');
  console.log(`\nHome ID for URLs: ${home.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
