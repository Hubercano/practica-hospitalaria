import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type SeedUser = {
  email: string;
  password: string;
  role: UserRole;
  institutionName?: string;
};

const seedUsers: SeedUser[] = [
  {
    email: 'admin@hospital.local',
    password: 'ChangeMe123!',
    role: UserRole.HOSPITAL,
  },
  {
    email: 'hospital.operaciones@hospital.local',
    password: 'HospitalOps123!',
    role: UserRole.HOSPITAL,
  },
  {
    email: 'sena.regional@institucion.local',
    password: 'SenaRegion123!',
    role: UserRole.INSTITUCION,
    institutionName: 'SENA Regional',
  },
  {
    email: 'unal.practicas@institucion.local',
    password: 'UnalPracticas123!',
    role: UserRole.INSTITUCION,
    institutionName: 'Universidad Nacional',
  },
];

async function main() {
  const institutions = await prisma.institution.findMany({
    select: { id: true, name: true },
  });

  const institutionByName = new Map(institutions.map((institution) => [institution.name, institution.id]));

  for (const user of seedUsers) {
    const institutionId = user.institutionName ? institutionByName.get(user.institutionName) : null;

    if (user.role === UserRole.INSTITUCION && !institutionId) {
      throw new Error(`No se encontró la institución requerida para ${user.email}: ${user.institutionName}`);
    }

    const passwordHash = await bcrypt.hash(user.password, 12);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        role: user.role,
        status: UserStatus.ACTIVE,
        institutionId,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        email: user.email,
        passwordHash,
        role: user.role,
        status: UserStatus.ACTIVE,
        institutionId,
      },
    });
  }

  console.log(JSON.stringify(seedUsers, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });