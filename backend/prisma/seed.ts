import { PrismaClient, RequirementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1. Crear Tipo de Institución: Universidad
  const universidad = await prisma.institutionType.upsert({
    where: { name: 'Universidad' },
    update: {},
    create: {
      name: 'Universidad',
      description: 'Instituciones de Educación Superior (IES)',
    },
  });

  console.log(`✅ Tipo creado: ${universidad.name}`);

  // 2. Definir Requisitos para Universidad
  const requisitos = [
    {
      name: 'Convenio Docencia-Servicio',
      description: 'Documento legal firmado entre las partes. Debe estar vigente.',
      type: RequirementType.FILE,
      isRequired: true,
      requiresExpiryDate: true,
    },
    {
      name: 'Póliza de Responsabilidad Civil',
      description: 'Póliza colectiva que cubre a los estudiantes.',
      type: RequirementType.FILE,
      isRequired: true,
      requiresExpiryDate: true,
    },
    {
      name: 'Carta de Presentación del Rector',
      description: 'Documento formal presentando la institución.',
      type: RequirementType.FILE,
      isRequired: true,
      requiresExpiryDate: false,
    },
    {
      name: 'Código SNIES',
      description: 'Código de identificación ante el Ministerio de Educación.',
      type: RequirementType.TEXT,
      isRequired: true,
      requiresExpiryDate: false, // Es un dato fijo
    }
  ];

  for (const req of requisitos) {
    // Buscamos si ya existe este requisito para este tipo de institución para no duplicar
    const existing = await prisma.requirementDefinition.findFirst({
        where: {
            institutionTypeId: universidad.id,
            name: req.name
        }
    });

    if (!existing) {
        await prisma.requirementDefinition.create({
            data: {
                ...req,
                institutionTypeId: universidad.id,
            }
        });
        console.log(`   🔸 Requisito agregado: ${req.name}`);
    }
  }

  // 3. Crear Tipo de Institución: Instituto Técnico
  const instituto = await prisma.institutionType.upsert({
    where: { name: 'Instituto Técnico' },
    update: {},
    create: {
      name: 'Instituto Técnico',
      description: 'Educación para el trabajo y desarrollo humano',
    },
  });
  
  console.log(`✅ Tipo creado: ${instituto.name}`);
  
  // Requisitos específicos para técnicos (quizás menos estrictos o diferentes)
  const requisitosTecnicos = [
    {
        name: 'Convenio de Prácticas',
        type: RequirementType.FILE,
        isRequired: true,
        requiresExpiryDate: true
    },
    {
        name: 'Resolución de Aprobación Secretaría de Educación',
        type: RequirementType.FILE,
        isRequired: true,
        requiresExpiryDate: false
    }
  ];

  for (const req of requisitosTecnicos) {
      const existing = await prisma.requirementDefinition.findFirst({
          where: { institutionTypeId: instituto.id, name: req.name }
      });

      if (!existing) {
          await prisma.requirementDefinition.create({
              data: { ...req, institutionTypeId: instituto.id }
          });
          console.log(`   🔸 Requisito agregado: ${req.name}`);
      }
  }

  // 4. Crear Tipo de Estudiante
  const tipoEstudiante = await prisma.studentType.upsert({
    where: { name: 'Pregrado' },
    update: {},
    create: {
      name: 'Pregrado',
      description: 'Estudiantes de educación pregrado'
    }
  });
  console.log(`✅ Tipo Estudiante creado: ${tipoEstudiante.name}`);

  // 5. Agregar instituciones de ejemplo
  const sena = await prisma.institution.upsert({
    where: { nit: '8000000000' },
    update: {},
    create: {
      name: 'SENA Regional',
      nit: '8000000000',
      email: 'contacto@sena.edu.co',
      address: 'Cra 3 # 16-00, Bogotá',
      typeId: instituto.id,
    }
  });
  console.log(`✅ Institución creada: ${sena.name}`);

  const unal = await prisma.institution.upsert({
    where: { nit: '8000000001' },
    update: {},
    create: {
      name: 'Universidad Nacional',
      nit: '8000000001',
      email: 'contacto@unal.edu.co',
      address: 'Carrera 45 # 26-85, Bogotá',
      typeId: universidad.id,
    }
  });
  console.log(`✅ Institución creada: ${unal.name}`);

  // 6. Crear Programas Académicos
  const programa1 = await prisma.academicProgram.create({
    data: {
      name: 'Ingeniería de Sistemas',
      level: 'Pregrado',
      institutionId: unal.id,
    }
  });
  console.log(`✅ Programa creado: ${programa1.name}`);

  const programa2 = await prisma.academicProgram.create({
    data: {
      name: 'Técnico en Desarrollo de Software',
      level: 'Técnico',
      institutionId: sena.id,
    }
  });
  console.log(`✅ Programa creado: ${programa2.name}`);

  // 7. Crear Áreas de Rotación
  const area1 = await prisma.rotationArea.create({
    data: {
      name: 'Pediatría',
      durationWeeks: 4,
      maxStudents: 5,
      programId: programa1.id,
    }
  });
  console.log(`✅ Área creada: ${area1.name}`);

  const area2 = await prisma.rotationArea.create({
    data: {
      name: 'Medicina Interna',
      durationWeeks: 6,
      maxStudents: 8,
      programId: programa1.id,
    }
  });
  console.log(`✅ Área creada: ${area2.name}`);

  // 8. Crear Docentes
  const teacher1 = await prisma.teacher.create({
    data: {
      firstName: 'Carlos',
      lastName: 'García',
      document: '1020304050',
      documentType: 'CC',
      email: 'dr.garcia@hospital.com',
      phone: '3001234567',
      supervisionType: 'directa',
      contractType: 'interno',
    }
  });
  console.log(`✅ Docente creado: ${teacher1.firstName} ${teacher1.lastName}`);

  const teacher2 = await prisma.teacher.create({
    data: {
      firstName: 'Ana',
      lastName: 'Martínez',
      document: '1020304051',
      documentType: 'CC',
      email: 'dra.martinez@hospital.com',
      phone: '3001234568',
      supervisionType: 'indirecta',
      contractType: 'convenio',
    }
  });
  console.log(`✅ Docente creado: ${teacher2.firstName} ${teacher2.lastName}`);

  // 9. Crear Estudiantes
  const student1 = await prisma.student.upsert({
    where: { email: 'juan.perez@universidad.edu' },
    update: {},
    create: {
      firstName: 'Juan',
      lastName: 'Pérez',
      document: '1020304052',
      documentType: 'CC',
      email: 'juan.perez@universidad.edu',
      typeId: tipoEstudiante.id,
    }
  });
  console.log(`✅ Estudiante creado: ${student1.firstName} ${student1.lastName}`);

  const student2 = await prisma.student.upsert({
    where: { email: 'maria.lopez@universidad.edu' },
    update: {},
    create: {
      firstName: 'María',
      lastName: 'López',
      document: '1020304053',
      documentType: 'CC',
      email: 'maria.lopez@universidad.edu',
      typeId: tipoEstudiante.id,
    }
  });
  console.log(`✅ Estudiante creado: ${student2.firstName} ${student2.lastName}`);

  console.log('\n🚀 Seed finalizado correctamente con datos de ejemplo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
