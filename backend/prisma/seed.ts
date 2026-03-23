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

  console.log('🚀 Seed finalizado correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
