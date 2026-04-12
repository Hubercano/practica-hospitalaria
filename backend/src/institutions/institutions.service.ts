import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateInstitutionDto, CreateInstitutionTypeDto, AddRequirementDto } from './dto';
import { EntityState, UserRole, ValidationStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class InstitutionsService {
  constructor(
    private prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  async getTypes() {
    return this.prisma.institutionType.findMany({
      include: {
        requirements: true,
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  async getType(id: string) {
    const type = await this.prisma.institutionType.findUnique({
      where: { id },
      include: { requirements: true },
    });
    if (!type) throw new NotFoundException('Tipo de Institución no encontrado');
    return type;
  }

  async createType(data: CreateInstitutionTypeDto) {
    return this.prisma.institutionType.create({
      data,
    });
  }

  async updateType(id: string, data: CreateInstitutionTypeDto) {
    await this.getType(id);
    return this.prisma.institutionType.update({
      where: { id },
      data,
    });
  }

  async addRequirementToType(typeId: string, data: AddRequirementDto) {
    // Validar que el tipo exista
    await this.getType(typeId);
    
    // 1. Crear el requisito
    const definition = await this.prisma.requirementDefinition.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        isRequired: data.isRequired,
        requiresExpiryDate: data.requiresExpiryDate,
        institutionTypeId: typeId,
      },
    });

    // 2. Buscar todas las instituciones de este tipo
    const institutions = await this.prisma.institution.findMany({
      where: { typeId },
      select: { id: true }
    });

    // 3. Crear el valor vacio (placeholder) para cada institucion existente
    if (institutions.length > 0) {
      const placeholders = institutions.map(inst => ({
        institutionId: inst.id,
        definitionId: definition.id,
        status: ValidationStatus.PENDING,
        value: null
      }));
      
      await this.prisma.institutionRequirementValue.createMany({
        data: placeholders
      });
    }

    return definition;
  }

  async removeRequirement(requirementId: string) {
    // Primero eliminar los valores asociados a este requisito en las instituciones
    await this.prisma.institutionRequirementValue.deleteMany({
      where: { definitionId: requirementId }
    });
    
    return this.prisma.requirementDefinition.delete({
      where: { id: requirementId },
    });
  }

  async removeType(id: string) {
    // Verificar si hay instituciones usando este tipo
    const count = await this.prisma.institution.count({ where: { typeId: id } });
    if (count > 0) {
      throw new ConflictException('No se puede eliminar el tipo porque tiene instituciones asociadas.');
    }
    
    // Eliminar definiciones de requisitos asociadas
    await this.prisma.requirementDefinition.deleteMany({ where: { institutionTypeId: id } });
    
    return this.prisma.institutionType.delete({ where: { id } });
  }

  async removeInstitution(id: string) {
    // Eliminar valores de requisitos primero
    await this.prisma.institutionRequirementValue.deleteMany({ where: { institutionId: id } });
    
    return this.prisma.institution.delete({ where: { id } });
  }

  async getRequirementsForType(typeId: string) {
    return this.prisma.requirementDefinition.findMany({
      where: { institutionTypeId: typeId },
    });
  }

  // Crear la institución base
  async create(data: CreateInstitutionDto) {
    const exists = await this.prisma.institution.findUnique({
      where: { nit: data.nit },
    });
    if (exists) {
      throw new ConflictException('Institución ya existe con ese NIT');
    }

    const institution = await this.prisma.institution.create({
      data: {
        name: data.name,
        nit: data.nit,
        email: data.email,
        phone: data.phone,
        address: data.address,
        typeId: data.typeId,
        state: 'INACTIVE',
      },
    });

    // Crear los placeholders de requisitos
    const requirements = await this.prisma.requirementDefinition.findMany({
      where: { institutionTypeId: data.typeId },
    });

    const initData = requirements.map((req) => ({
      institutionId: institution.id,
      definitionId: req.id,
      status: ValidationStatus.PENDING,
      value: null,
    }));

    if (initData.length > 0) {
      await this.prisma.institutionRequirementValue.createMany({
        data: initData,
      });
    }

    return institution;
  }

  async updateInstitution(id: string, data: Partial<CreateInstitutionDto>) {
    const existing = await this.prisma.institution.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Institución no encontrada');
    }

    if (data.nit && data.nit !== existing.nit) {
      const nitInUse = await this.prisma.institution.findUnique({ where: { nit: data.nit } });
      if (nitInUse) {
        throw new ConflictException('Ya existe una institución con ese NIT');
      }
    }

    return this.prisma.institution.update({
      where: { id },
      data: {
        name: data.name,
        nit: data.nit,
        email: data.email,
        phone: data.phone,
        address: data.address,
        typeId: data.typeId,
      },
    });
  }

  async updateInstitutionState(id: string, state: EntityState) {
    const existing = await this.prisma.institution.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Institución no encontrada');
    }

    return this.prisma.institution.update({
      where: { id },
      data: { state },
    });
  }

  async findAll(includeInactive = false, user?: AuthenticatedUser): Promise<any[]> {
    const institutions = await this.prisma.institution.findMany({
      where: {
        deletedAt: null,
        ...(user?.role === UserRole.INSTITUCION ? { id: this.requireInstitutionId(user) } : {}),
        ...(includeInactive ? {} : { state: EntityState.ACTIVE }),
      },
      include: {
        type: {
          include: { requirements: true }
        },
        requirements: {
          include: { definition: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return institutions.map(inst => {
      let status = 'COMPLETADO';
      
      let hasCritical = false;
      let hasExpiringSoon = false;
      let hasPending = false;

      const now = new Date();
      now.setHours(0,0,0,0);
      
      const criticalThreshold = new Date(now); 
      criticalThreshold.setDate(now.getDate() + 5);
      
      const warningThreshold = new Date(now); 
      warningThreshold.setDate(now.getDate() + 30);

      const valuesMap = new Map(inst.requirements.map(r => [r.definitionId, r]));

      for (const def of inst.type.requirements) {
        const val = valuesMap.get(def.id);

        // 1. Verificar Documentos Pendientes (Obligatorios sin subir)
        if (def.isRequired) {
            // Se considera pendiente si no existe el registro o el valor está vacío
            if (!val || !val.value) {
                hasPending = true;
            }
        }

        // 2. Verificar Fechas de Vencimiento
        if (val && val.expiryDate) {
            const expiry = new Date(val.expiryDate);
            expiry.setHours(0,0,0,0);

            if (expiry <= criticalThreshold) {
                hasCritical = true;
            } else if (expiry <= warningThreshold) {
                hasExpiringSoon = true;
            }
        }
      }

      // Determinar estado por prioridad: CRÍTICO > PRÓXIMO > PENDING > COMPLETADO
      if (hasCritical) {
        status = 'CRÍTICO';
      } else if (hasExpiringSoon) {
        status = 'PRÓXIMO A VENCER';
      } else if (hasPending) {
        status = 'PENDIENTE';
      }

      return {
        ...inst,
        status
      };
    });
  }

  async findOne(id: string, user?: AuthenticatedUser): Promise<any> {
    if (user?.role === UserRole.INSTITUCION && id !== this.requireInstitutionId(user)) {
      throw new NotFoundException('Institución no encontrada');
    }

    const institution = await this.prisma.institution.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        type: {
          include: { requirements: true }
        },
        requirements: {
          include: { definition: true }
        }
      },
    });

    if (!institution) throw new NotFoundException('Institución no encontrada');

    // --- AUTO-FIX: Verificar si faltan requisitos por asignar ---
    // Esto corrige instituciones antiguas (como Sena) que no recibieron los nuevos requisitos
    const existingDefIds = new Set(institution.requirements.map(r => r.definitionId));
    const missingDefinitions = institution.type.requirements.filter(def => !existingDefIds.has(def.id));

    if (missingDefinitions.length > 0) {
       // Crear los requisitos faltantes
       const newValues = missingDefinitions.map(def => ({
         institutionId: institution.id,
         definitionId: def.id,
         status: ValidationStatus.PENDING,
         value: null
       }));

       await this.prisma.institutionRequirementValue.createMany({
         data: newValues
       });

       // Hacemos llamada recursiva para devolver el objeto completo y actualizado
       return this.findOne(id);
    }

    await this.documentsService.ensureInstitutionRequirementSlots(
      institution.requirements.map((requirement) => ({
        id: requirement.id,
        institutionId: institution.id,
        definition: {
          id: requirement.definition.id,
          name: requirement.definition.name,
          description: requirement.definition.description,
          type: requirement.definition.type,
          isRequired: requirement.definition.isRequired,
          requiresExpiryDate: requirement.definition.requiresExpiryDate,
        },
      })),
    );

    const slotMap = await this.documentsService.getInstitutionRequirementSlotMap(
      institution.requirements.map((requirement) => requirement.id),
    );

    const requirementKeys = institution.requirements.map(
      (requirement) => `institution-requirement:${requirement.definitionId}`,
    );

    const fallbackSlots = await this.prisma.documentSlot.findMany({
      where: {
        subjectType: 'INSTITUTION',
        subjectId: institution.id,
        key: { in: requirementKeys },
      },
      include: {
        versions: {
          where: { isCurrent: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    const fallbackSlotMap = new Map(fallbackSlots.map((slot) => [slot.key, slot]));

    return {
      ...institution,
      requirements: institution.requirements.map((requirement) => {
        const slot =
          slotMap.get(requirement.id) ??
          fallbackSlotMap.get(`institution-requirement:${requirement.definitionId}`);
        const currentVersion = slot?.versions?.[0] ?? null;

        return {
          ...requirement,
          documentSlotId: slot?.id ?? null,
          displayValue:
            currentVersion?.originalFileName ??
            currentVersion?.textValue ??
            (currentVersion?.dateValue ? currentVersion.dateValue.toISOString().slice(0, 10) : requirement.value),
          currentDocument: currentVersion ? this.documentsService.serializeVersion(currentVersion) : null,
        };
      }),
    };
  }

  async submitRequirement(reqValueId: string, value: string, expiryDate?: string, user?: AuthenticatedUser) {
    if (!user) {
      throw new NotFoundException('Usuario no autenticado');
    }

    return this.documentsService.submitInstitutionRequirementValueByRequirementId(
      reqValueId,
      { value, expiryDate },
      user,
    );
  }

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Plantilla Instituciones');

    worksheet.columns = [
      { header: 'Nombre (Obligatorio)', key: 'name', width: 30 },
      { header: 'NIT (Obligatorio, Único)', key: 'nit', width: 20 },
      { header: 'Correo (Obligatorio)', key: 'email', width: 30 },
      { header: 'Tipo Institución (Exacto)', key: 'type', width: 25 },
      { header: 'Teléfono (Opcional)', key: 'phone', width: 20 },
      { header: 'Dirección (Opcional)', key: 'address', width: 30 },
    ];

    // Agregar fila de ejemplo
    worksheet.addRow({
      name: 'Hospital San José',
      nit: '900123456-1',
      email: 'contacto@hsj.com',
      type: 'Hospital Nivel 1',
      phone: '3001234567',
      address: 'Calle 123 # 45-67',
    });

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async processBulkUpload(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se ha subido ningún archivo');

    const workbook = new ExcelJS.Workbook();
    // Forzamos el tipo 'any' para evitar conflictos entre las definiciones de tipos globales de Buffer y ExcelJS
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) throw new BadRequestException('El archivo Excel no tiene hojas válidas');

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as { row: number; message: string }[]
    };

    const rows: any[] = [];
    
    // Leer filas (saltando header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const rowValues = row.values as any[];
      // ExcelJS values array is 1-based, index 0 is undefined usually? 
      // Depends on implementation, easier to use getCell or assume logic.
      // Let's use cell access for safety.
      rows.push({
        rowNumber,
        name: row.getCell(1).text,
        nit: row.getCell(2).text,
        email: row.getCell(3).text,
        typeName: row.getCell(4).text,
        phone: row.getCell(5).text,
        address: row.getCell(6).text,
      });
    });

    results.total = rows.length;

    // Obtener todos los tipos para validar
    const allTypes = await this.prisma.institutionType.findMany();
    const typesMap = new Map(allTypes.map(t => [t.name.toLowerCase().trim(), t.id]));

    for (const row of rows) {
      try {
        if (!row.name || !row.nit || !row.email || !row.typeName) {
          throw new Error('Faltan campos obligatorios');
        }

        const typeId = typesMap.get(row.typeName.toLowerCase().trim());
        if (!typeId) {
          throw new Error(`Tipo de institución '${row.typeName}' no existe en el sistema`);
        }

        // Crear usando la lógica existente (create maneja duplicados y requisitos)
        // Pero create lanza excepcion, hay que atraparlo
        try {
           await this.create({
             name: row.name,
             nit: row.nit,
             email: row.email,
             typeId: typeId,
             phone: row.phone,
             address: row.address
           });
           results.success++;
        } catch (error) {
           if (error instanceof ConflictException) {
             throw new Error('NIT ya registrado');
           }
           throw error;
        }

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: row.rowNumber,
          message: error.message || 'Error desconocido'
        });
      }
    }

    return results;
  }

  private requireInstitutionId(user: AuthenticatedUser) {
    if (!user.institutionId) {
      throw new NotFoundException('El usuario no tiene una institución asociada.');
    }

    return user.institutionId;
  }
}
