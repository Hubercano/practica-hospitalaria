import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error('Debe enviar la ruta del Excel. Ejemplo: npm run import:autoevaluation-catalog -- "C:/ruta/archivo.xlsx"');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('No se encontró una hoja válida en el archivo Excel.');
  }

  const factorIdByName = new Map<string, string>();
  const criterionOrderByFactor = new Map<string, number>();

  let createdFactors = 0;
  let createdCriteria = 0;
  let updatedCriteria = 0;

  for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);

    const qualityCondition = normalizeCell(row.getCell(1).text);
    const aspectToEvaluate = normalizeCell(row.getCell(2).text);
    const verificationMechanism = normalizeCell(row.getCell(3).text);

    if (!qualityCondition || !aspectToEvaluate) {
      continue;
    }

    if (qualityCondition.toLowerCase().includes('condición de calidad') || aspectToEvaluate.toLowerCase().includes('aspectos a evaluar')) {
      continue;
    }

    let factorId = factorIdByName.get(qualityCondition);

    if (!factorId) {
      const existingFactor = await prisma.autoevaluationFactor.findFirst({
        where: { name: qualityCondition },
        select: { id: true },
      });

      if (existingFactor) {
        factorId = existingFactor.id;
      } else {
        const createdFactor = await prisma.autoevaluationFactor.create({
          data: {
            name: qualityCondition,
            orderIndex: factorIdByName.size,
            isActive: true,
          },
          select: { id: true },
        });

        factorId = createdFactor.id;
        createdFactors++;
      }

      factorIdByName.set(qualityCondition, factorId);

      const criterionCount = await prisma.autoevaluationCriterion.count({ where: { factorId } });
      criterionOrderByFactor.set(factorId, criterionCount);
    }

    const existingCriterion = await prisma.autoevaluationCriterion.findFirst({
      where: {
        factorId,
        name: aspectToEvaluate,
      },
      select: { id: true, description: true },
    });

    if (existingCriterion) {
      await prisma.autoevaluationCriterion.update({
        where: { id: existingCriterion.id },
        data: {
          description: verificationMechanism || existingCriterion.description,
          isActive: true,
          deletedAt: null,
        },
      });
      updatedCriteria++;
      continue;
    }

    const currentOrder = criterionOrderByFactor.get(factorId) ?? 0;

    await prisma.autoevaluationCriterion.create({
      data: {
        factorId,
        name: aspectToEvaluate,
        description: verificationMechanism || null,
        weight: 1,
        orderIndex: currentOrder,
        isActive: true,
      },
    });

    criterionOrderByFactor.set(factorId, currentOrder + 1);
    createdCriteria++;
  }

  console.log('Importación de catálogo finalizada.');
  console.log(`Factores creados: ${createdFactors}`);
  console.log(`Criterios creados: ${createdCriteria}`);
  console.log(`Criterios actualizados: ${updatedCriteria}`);
}

run()
  .catch((error) => {
    console.error('Error importando catálogo de autoevaluación:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
