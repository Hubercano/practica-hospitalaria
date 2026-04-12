import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentSubjectType,
  DocumentWorkflowStatus,
  RequirementType,
  UserRole,
  ValidationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { SubmitDocumentValueDto } from './dto/submit-document-value.dto';

type InstitutionRequirementForSlot = {
  id: string;
  institutionId: string;
  definition: {
    id: string;
    name: string;
    description: string | null;
    type: RequirementType;
    isRequired: boolean;
    requiresExpiryDate: boolean;
  };
};

type StudentRequirementForSlot = {
  id: string;
  studentId: string;
  definition: {
    id: string;
    name: string;
    description: string | null;
    type: RequirementType;
    isRequired: boolean;
    requiresExpiryDate: boolean;
  };
};

type TeacherDocumentField =
  | 'cvFile'
  | 'dataAuthorizationFile'
  | 'conflictOfInterestFile'
  | 'teacherTrainingFiles'
  | 'teacherRecognitionFiles';

const TEACHER_SLOT_DEFINITIONS: Record<
  TeacherDocumentField,
  {
    key: string;
    label: string;
    description: string;
    allowsMultipleFiles: boolean;
  }
> = {
  cvFile: {
    key: 'teacher:cv-file',
    label: 'Hoja de Vida',
    description: 'Documento de hoja de vida del docente.',
    allowsMultipleFiles: false,
  },
  dataAuthorizationFile: {
    key: 'teacher:data-authorization-file',
    label: 'Autorización de Tratamiento de Datos',
    description: 'Autorización de tratamiento de datos personales.',
    allowsMultipleFiles: false,
  },
  conflictOfInterestFile: {
    key: 'teacher:conflict-of-interest-file',
    label: 'Conflicto de Intereses',
    description: 'Declaración de conflicto de intereses.',
    allowsMultipleFiles: false,
  },
  teacherTrainingFiles: {
    key: 'teacher:training-files',
    label: 'Formación del Docente',
    description: 'Certificados de formación del docente.',
    allowsMultipleFiles: true,
  },
  teacherRecognitionFiles: {
    key: 'teacher:recognition-files',
    label: 'Reconocimiento Docente',
    description: 'Soportes de reconocimiento docente.',
    allowsMultipleFiles: true,
  },
};

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureInstitutionRequirementSlots(requirements: InstitutionRequirementForSlot[]) {
    if (!requirements.length) {
      return;
    }

    for (const requirement of requirements) {
      await this.prisma.documentSlot.upsert({
        where: {
          subjectType_subjectId_key: {
            subjectType: DocumentSubjectType.INSTITUTION,
            subjectId: requirement.institutionId,
            key: `institution-requirement:${requirement.definition.id}`,
          },
        },
        create: {
          subjectType: DocumentSubjectType.INSTITUTION,
          subjectId: requirement.institutionId,
          key: `institution-requirement:${requirement.definition.id}`,
          label: requirement.definition.name,
          description: requirement.definition.description,
          documentType: requirement.definition.type,
          isRequired: requirement.definition.isRequired,
          requiresExpiryDate: requirement.definition.requiresExpiryDate,
          institutionRequirementValueId: requirement.id,
        },
        update: {
          label: requirement.definition.name,
          description: requirement.definition.description,
          documentType: requirement.definition.type,
          isRequired: requirement.definition.isRequired,
          requiresExpiryDate: requirement.definition.requiresExpiryDate,
          institutionRequirementValueId: requirement.id,
          deletedAt: null,
        },
      });
    }
  }

  async getInstitutionRequirementSlotMap(requirementIds: string[]) {
    if (!requirementIds.length) {
      return new Map();
    }

    const slots = await this.prisma.documentSlot.findMany({
      where: {
        institutionRequirementValueId: {
          in: requirementIds,
        },
      },
      include: {
        versions: {
          where: { isCurrent: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    return new Map(
      slots
        .filter((slot) => !!slot.institutionRequirementValueId)
        .map((slot) => [slot.institutionRequirementValueId as string, slot]),
    );
  }

  async ensureStudentRequirementSlots(requirements: StudentRequirementForSlot[]) {
    if (!requirements.length) {
      return;
    }

    const studentIds = Array.from(new Set(requirements.map((requirement) => requirement.studentId)));
    const keys = requirements.map((requirement) => `student-requirement:${requirement.definition.id}`);
    const existing = await this.prisma.documentSlot.findMany({
      where: {
        subjectType: DocumentSubjectType.STUDENT,
        subjectId: { in: studentIds },
        key: { in: keys },
      },
      select: { subjectId: true, key: true },
    });

    const existingKeys = new Set(existing.map((slot) => `${slot.subjectId}:${slot.key}`));
    const missing = requirements.filter(
      (requirement) => !existingKeys.has(`${requirement.studentId}:student-requirement:${requirement.definition.id}`),
    );

    if (!missing.length) {
      return;
    }

    await this.prisma.documentSlot.createMany({
      data: missing.map((requirement) => ({
        subjectType: DocumentSubjectType.STUDENT,
        subjectId: requirement.studentId,
        key: `student-requirement:${requirement.definition.id}`,
        label: requirement.definition.name,
        description: requirement.definition.description,
        documentType: requirement.definition.type,
        isRequired: requirement.definition.isRequired,
        requiresExpiryDate: requirement.definition.requiresExpiryDate,
      })),
      skipDuplicates: true,
    });
  }

  async getStudentRequirementSlotMap(
    requirements: Array<{ id: string; studentId: string; definitionId: string }>,
  ) {
    if (!requirements.length) {
      return new Map();
    }

    const studentIds = Array.from(new Set(requirements.map((requirement) => requirement.studentId)));
    const keys = requirements.map((requirement) => `student-requirement:${requirement.definitionId}`);
    const slots = await this.prisma.documentSlot.findMany({
      where: {
        subjectType: DocumentSubjectType.STUDENT,
        subjectId: { in: studentIds },
        key: { in: keys },
      },
      include: {
        versions: {
          where: { isCurrent: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    const slotMap = new Map(slots.map((slot) => [`${slot.subjectId}:${slot.key}`, slot]));
    return new Map(
      requirements.map((requirement) => [
        requirement.id,
        slotMap.get(`${requirement.studentId}:student-requirement:${requirement.definitionId}`),
      ]),
    );
  }

  async ensureTeacherSlots(teacherIds: string[]) {
    if (!teacherIds.length) {
      return;
    }

    const uniqueTeacherIds = Array.from(new Set(teacherIds));
    const existing = await this.prisma.documentSlot.findMany({
      where: {
        subjectType: DocumentSubjectType.TEACHER,
        subjectId: { in: uniqueTeacherIds },
      },
      select: { subjectId: true, key: true },
    });

    const existingKeys = new Set(existing.map((slot) => `${slot.subjectId}:${slot.key}`));
    const missing: Array<{
      subjectId: string;
      key: string;
      label: string;
      description: string;
      allowsMultipleFiles: boolean;
    }> = [];

    for (const teacherId of uniqueTeacherIds) {
      for (const definition of Object.values(TEACHER_SLOT_DEFINITIONS)) {
        const compositeKey = `${teacherId}:${definition.key}`;
        if (!existingKeys.has(compositeKey)) {
          missing.push({
            subjectId: teacherId,
            key: definition.key,
            label: definition.label,
            description: definition.description,
            allowsMultipleFiles: definition.allowsMultipleFiles,
          });
        }
      }
    }

    if (!missing.length) {
      return;
    }

    await this.prisma.documentSlot.createMany({
      data: missing.map((slot) => ({
        subjectType: DocumentSubjectType.TEACHER,
        subjectId: slot.subjectId,
        key: slot.key,
        label: slot.label,
        description: slot.description,
        documentType: RequirementType.FILE,
        isRequired: true,
        requiresExpiryDate: false,
        allowsMultipleFiles: slot.allowsMultipleFiles,
      })),
      skipDuplicates: true,
    });
  }

  async getTeacherSlotMap(teacherIds: string[]) {
    if (!teacherIds.length) {
      return new Map();
    }

    const slots = await this.prisma.documentSlot.findMany({
      where: {
        subjectType: DocumentSubjectType.TEACHER,
        subjectId: { in: teacherIds },
      },
      include: {
        versions: {
          where: { isCurrent: true },
          orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    return new Map(slots.map((slot) => [`${slot.subjectId}:${slot.key}`, slot]));
  }

  async uploadTeacherDocument(
    teacherId: string,
    field: TeacherDocumentField,
    files: Express.Multer.File[],
    user: AuthenticatedUser,
  ) {
    if (!files.length) {
      throw new BadRequestException('Archivo no subido');
    }

    await this.ensureTeacherSlots([teacherId]);
    const definition = TEACHER_SLOT_DEFINITIONS[field];
    const slot = await this.prisma.documentSlot.findFirst({
      where: {
        subjectType: DocumentSubjectType.TEACHER,
        subjectId: teacherId,
        key: definition.key,
      },
      include: {
        versions: {
          where: { isCurrent: true },
          orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot documental no encontrado');
    }

    const allCurrentFiles = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.documentVersion.findFirst({
        where: { slotId: slot.id },
        orderBy: { versionNumber: 'desc' },
      });

      let nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

      if (!slot.allowsMultipleFiles) {
        await tx.documentVersion.updateMany({
          where: { slotId: slot.id, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      for (const file of files) {
        await tx.documentVersion.create({
          data: {
            slotId: slot.id,
            versionNumber: nextVersionNumber,
            isCurrent: true,
            status: DocumentWorkflowStatus.PENDING,
            fileUrl: `/uploads/teachers/${file.filename}`,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadedBy: user.id,
          },
        });
        nextVersionNumber += 1;
      }

      const currentVersions = await tx.documentVersion.findMany({
        where: { slotId: slot.id, isCurrent: true },
        orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
      });

      return currentVersions.map((version) => version.fileUrl).filter((value): value is string => !!value);
    });

    return this.syncTeacherLegacyField(teacherId, field, allCurrentFiles);
  }

  async deleteTeacherDocument(
    teacherId: string,
    field: TeacherDocumentField,
    fileUrl: string | null,
  ) {
    await this.ensureTeacherSlots([teacherId]);
    const definition = TEACHER_SLOT_DEFINITIONS[field];
    const slot = await this.prisma.documentSlot.findFirst({
      where: {
        subjectType: DocumentSubjectType.TEACHER,
        subjectId: teacherId,
        key: definition.key,
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot documental no encontrado');
    }

    const currentFiles = await this.prisma.$transaction(async (tx) => {
      const where = {
        slotId: slot.id,
        isCurrent: true,
        ...(fileUrl ? { fileUrl } : {}),
      };

      const updatedCount = await tx.documentVersion.updateMany({
        where,
        data: { isCurrent: false },
      });

      if (updatedCount.count === 0) {
        throw new NotFoundException('Documento no encontrado');
      }

      const currentVersions = await tx.documentVersion.findMany({
        where: { slotId: slot.id, isCurrent: true },
        orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
      });

      return currentVersions.map((version) => version.fileUrl).filter((value): value is string => !!value);
    });

    return this.syncTeacherLegacyField(teacherId, field, currentFiles);
  }

  serializeVersion(version: {
    id: string;
    versionNumber: number;
    status: DocumentWorkflowStatus;
    fileUrl: string | null;
    originalFileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    textValue: string | null;
    dateValue: Date | null;
    expiryDate: Date | null;
    rejectionReason: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    uploadedBy: string | null;
    uploadedAt: Date;
    createdAt: Date;
  }) {
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      status: version.status,
      fileUrl: version.fileUrl,
      originalFileName: version.originalFileName,
      mimeType: version.mimeType,
      sizeBytes: version.sizeBytes,
      textValue: version.textValue,
      dateValue: version.dateValue,
      expiryDate: version.expiryDate,
      rejectionReason: version.rejectionReason,
      reviewedBy: version.reviewedBy,
      reviewedAt: version.reviewedAt,
      uploadedBy: version.uploadedBy,
      uploadedAt: version.uploadedAt,
      createdAt: version.createdAt,
      value: version.fileUrl ?? version.textValue ?? version.dateValue,
    };
  }

  async getSlotHistory(slotId: string, user: AuthenticatedUser) {
    if (user.role !== UserRole.HOSPITAL) {
      throw new ForbiddenException('Solo el hospital puede consultar el historial');
    }

    const slot = await this.getAccessibleSlot(slotId, user);

    const versions = await this.prisma.documentVersion.findMany({
      where: { slotId: slot.id },
      orderBy: { versionNumber: 'desc' },
    });

    return {
      slot: {
        id: slot.id,
        label: slot.label,
        description: slot.description,
        subjectType: slot.subjectType,
        subjectId: slot.subjectId,
        documentType: slot.documentType,
      },
      versions: versions.map((version) => this.serializeVersion(version)),
    };
  }

  async submitInstitutionRequirementValueByRequirementId(
    requirementValueId: string,
    dto: SubmitDocumentValueDto,
    user: AuthenticatedUser,
  ) {
    const requirement = await this.prisma.institutionRequirementValue.findFirst({
      where: {
        id: requirementValueId,
        ...(user.role === UserRole.INSTITUCION ? { institutionId: this.requireInstitutionId(user) } : {}),
      },
      include: {
        definition: true,
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requisito no encontrado');
    }

    await this.ensureInstitutionRequirementSlots([
      {
        id: requirement.id,
        institutionId: requirement.institutionId,
        definition: {
          id: requirement.definition.id,
          name: requirement.definition.name,
          description: requirement.definition.description,
          type: requirement.definition.type,
          isRequired: requirement.definition.isRequired,
          requiresExpiryDate: requirement.definition.requiresExpiryDate,
        },
      },
    ]);

    const slot = await this.prisma.documentSlot.findFirst({
      where: { institutionRequirementValueId: requirement.id },
    });

    if (!slot) {
      throw new NotFoundException('Slot documental no encontrado');
    }

    return this.submitDocumentValue(slot.id, dto, user);
  }

  async submitStudentRequirementValueByRequirementId(
    requirementValueId: string,
    dto: SubmitDocumentValueDto,
    user: AuthenticatedUser,
  ) {
    const requirement = await this.prisma.studentRequirementValue.findFirst({
      where: {
        id: requirementValueId,
        ...(user.role === UserRole.INSTITUCION
          ? {
              student: {
                institutionId: this.requireInstitutionId(user),
              },
            }
          : {}),
      },
      include: {
        definition: true,
        student: {
          select: { id: true },
        },
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requisito no encontrado');
    }

    await this.ensureStudentRequirementSlots([
      {
        id: requirement.id,
        studentId: requirement.student.id,
        definition: {
          id: requirement.definition.id,
          name: requirement.definition.name,
          description: requirement.definition.description,
          type: requirement.definition.type,
          isRequired: requirement.definition.isRequired,
          requiresExpiryDate: requirement.definition.requiresExpiryDate,
        },
      },
    ]);

    const slot = await this.prisma.documentSlot.findFirst({
      where: {
        subjectType: DocumentSubjectType.STUDENT,
        subjectId: requirement.student.id,
        key: `student-requirement:${requirement.definition.id}`,
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot documental no encontrado');
    }

    return this.submitDocumentValue(slot.id, dto, user);
  }

  async submitDocumentValue(slotId: string, dto: SubmitDocumentValueDto, user: AuthenticatedUser) {
    const slot = await this.getAccessibleSlot(slotId, user);
    this.assertSubmissionAllowed(slot, user);

    if (slot.documentType === RequirementType.FILE) {
      throw new BadRequestException('Este documento requiere carga de archivo');
    }

    if (slot.requiresExpiryDate && !dto.expiryDate) {
      throw new BadRequestException('La fecha de vencimiento es obligatoria');
    }

    const normalizedTextValue = slot.documentType === RequirementType.TEXT ? (dto.value ?? '').trim() : null;
    const normalizedDateValue = slot.documentType === RequirementType.DATE && dto.value ? new Date(dto.value) : null;
    const normalizedExpiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;

    if (slot.documentType === RequirementType.TEXT && slot.isRequired && !normalizedTextValue) {
      throw new BadRequestException('El valor es obligatorio');
    }

    if (slot.documentType === RequirementType.DATE && slot.isRequired && !normalizedDateValue) {
      throw new BadRequestException('La fecha es obligatoria');
    }

    const version = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.documentVersion.findFirst({
        where: { slotId: slot.id },
        orderBy: { versionNumber: 'desc' },
      });

      await tx.documentVersion.updateMany({
        where: { slotId: slot.id, isCurrent: true },
        data: { isCurrent: false },
      });

      const created = await tx.documentVersion.create({
        data: {
          slotId: slot.id,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          status: DocumentWorkflowStatus.PENDING,
          isCurrent: true,
          textValue: normalizedTextValue,
          dateValue: normalizedDateValue,
          expiryDate: normalizedExpiryDate,
          uploadedBy: user.id,
        },
      });

      if (slot.institutionRequirementValueId) {
        await tx.institutionRequirementValue.update({
          where: { id: slot.institutionRequirementValueId },
          data: {
            value: normalizedTextValue ?? (normalizedDateValue ? normalizedDateValue.toISOString() : null),
            expiryDate: normalizedExpiryDate,
            status: ValidationStatus.PENDING,
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
          },
        });
      }

      if (slot.subjectType === DocumentSubjectType.STUDENT) {
        await tx.studentRequirementValue.updateMany({
          where: {
            studentId: slot.subjectId,
            definitionId: this.extractDefinitionIdFromKey(slot.key),
          },
          data: {
            value: normalizedTextValue ?? (normalizedDateValue ? normalizedDateValue.toISOString() : null),
            expiryDate: normalizedExpiryDate,
            status: ValidationStatus.PENDING,
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
          },
        });
      }

      return created;
    });

    return this.serializeVersion(version);
  }

  async uploadInstitutionRequirementFile(
    slotId: string,
    file: Express.Multer.File,
    expiryDate: string | undefined,
    user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo no subido');
    }

    const slot = await this.getAccessibleSlot(slotId, user);
    this.assertSubmissionAllowed(slot, user);

    if (slot.documentType !== RequirementType.FILE) {
      throw new BadRequestException('Este slot no admite archivos');
    }

    if (slot.requiresExpiryDate && !expiryDate) {
      throw new BadRequestException('La fecha de vencimiento es obligatoria');
    }

    const normalizedExpiryDate = expiryDate ? new Date(expiryDate) : null;
    const fileUrl = `/uploads/documents/${file.filename}`;

    const version = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.documentVersion.findFirst({
        where: { slotId: slot.id },
        orderBy: { versionNumber: 'desc' },
      });

      await tx.documentVersion.updateMany({
        where: { slotId: slot.id, isCurrent: true },
        data: { isCurrent: false },
      });

      const created = await tx.documentVersion.create({
        data: {
          slotId: slot.id,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          status: DocumentWorkflowStatus.PENDING,
          isCurrent: true,
          fileUrl,
          originalFileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          expiryDate: normalizedExpiryDate,
          uploadedBy: user.id,
        },
      });

      if (slot.institutionRequirementValueId) {
        await tx.institutionRequirementValue.update({
          where: { id: slot.institutionRequirementValueId },
          data: {
            value: fileUrl,
            expiryDate: normalizedExpiryDate,
            status: ValidationStatus.PENDING,
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
          },
        });
      }

      if (slot.subjectType === DocumentSubjectType.STUDENT) {
        await tx.studentRequirementValue.updateMany({
          where: {
            studentId: slot.subjectId,
            definitionId: this.extractDefinitionIdFromKey(slot.key),
          },
          data: {
            value: fileUrl,
            expiryDate: normalizedExpiryDate,
            status: ValidationStatus.PENDING,
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
          },
        });
      }

      return created;
    });

    return this.serializeVersion(version);
  }

  async reviewCurrentVersion(slotId: string, dto: ReviewDocumentDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.HOSPITAL) {
      throw new ForbiddenException('Solo el hospital puede aprobar o rechazar');
    }

    const slot = await this.getAccessibleSlot(slotId, user);

    const currentVersion = await this.prisma.documentVersion.findFirst({
      where: {
        slotId: slot.id,
        isCurrent: true,
      },
    });

    if (!currentVersion) {
      throw new NotFoundException('No existe una versión actual para revisar');
    }

    return this.reviewVersionEntity(currentVersion.id, dto, user);
  }

  async reviewVersion(versionId: string, dto: ReviewDocumentDto, user: AuthenticatedUser) {
    if (user.role !== UserRole.HOSPITAL) {
      throw new ForbiddenException('Solo el hospital puede aprobar o rechazar');
    }

    return this.reviewVersionEntity(versionId, dto, user);
  }

  private async reviewVersionEntity(versionId: string, dto: ReviewDocumentDto, user: AuthenticatedUser) {
    const versionWithSlot = await this.prisma.documentVersion.findFirst({
      where: { id: versionId },
      include: { slot: true },
    });

    if (!versionWithSlot) {
      throw new NotFoundException('Versión documental no encontrada');
    }

    const slot = await this.getAccessibleSlot(versionWithSlot.slotId, user);
    const rejectionReason = dto.status === DocumentWorkflowStatus.REJECTED ? dto.rejectionReason?.trim() : null;

    if (dto.status === DocumentWorkflowStatus.REJECTED && !rejectionReason) {
      throw new BadRequestException('La observación de rechazo es obligatoria');
    }

    if (!versionWithSlot.isCurrent) {
      throw new BadRequestException('Solo se pueden revisar versiones actuales');
    }

    const reviewedAt = new Date();
    const version = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.documentVersion.update({
        where: { id: versionWithSlot.id },
        data: {
          status: dto.status,
          rejectionReason,
          reviewedBy: user.id,
          reviewedAt,
        },
      });

      if (slot.institutionRequirementValueId) {
        await tx.institutionRequirementValue.update({
          where: { id: slot.institutionRequirementValueId },
          data: {
            status: this.toValidationStatus(dto.status),
            rejectionReason,
            reviewedBy: user.id,
            reviewedAt,
          },
        });
      }

      if (slot.subjectType === DocumentSubjectType.STUDENT) {
        await tx.studentRequirementValue.updateMany({
          where: {
            studentId: slot.subjectId,
            definitionId: this.extractDefinitionIdFromKey(slot.key),
          },
          data: {
            status: this.toValidationStatus(dto.status),
            rejectionReason,
            reviewedBy: user.id,
            reviewedAt,
          },
        });
      }

      return updated;
    });

    return this.serializeVersion(version);
  }

  private async getAccessibleSlot(slotId: string, user: AuthenticatedUser) {
    const slot = await this.prisma.documentSlot.findFirst({
      where: {
        id: slotId,
        deletedAt: null,
      },
    });

    if (!slot) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (
      slot.subjectType === DocumentSubjectType.INSTITUTION &&
      user.role === UserRole.INSTITUCION &&
      slot.subjectId !== this.requireInstitutionId(user)
    ) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (slot.subjectType === DocumentSubjectType.STUDENT && user.role === UserRole.INSTITUCION) {
      const student = await this.prisma.student.findFirst({
        where: {
          id: slot.subjectId,
          institutionId: this.requireInstitutionId(user),
        },
        select: { id: true },
      });

      if (!student) {
        throw new NotFoundException('Documento no encontrado');
      }
    }

    if (slot.subjectType === DocumentSubjectType.TEACHER && user.role !== UserRole.HOSPITAL) {
      throw new NotFoundException('Documento no encontrado');
    }

    return slot;
  }

  private assertSubmissionAllowed(
    slot: { subjectType: DocumentSubjectType; subjectId: string; documentType: RequirementType; requiresExpiryDate: boolean; isRequired: boolean },
    user: AuthenticatedUser,
  ) {
    if (slot.subjectType === DocumentSubjectType.INSTITUTION) {
      if (user.role === UserRole.HOSPITAL) {
        return;
      }

      if (user.role !== UserRole.INSTITUCION || slot.subjectId !== this.requireInstitutionId(user)) {
        throw new ForbiddenException('Solo la institución propietaria o el hospital pueden subir o reemplazar documentos');
      }

      return;
    }

    if (slot.subjectType === DocumentSubjectType.STUDENT) {
      if (user.role === UserRole.HOSPITAL) {
        return;
      }

      if (user.role !== UserRole.INSTITUCION) {
        throw new ForbiddenException('Solo la institución del estudiante o el hospital pueden subir o reemplazar documentos');
      }

      return;
    }

    throw new BadRequestException('Este endpoint aún no soporta este tipo de sujeto');
  }

  private requireInstitutionId(user: AuthenticatedUser) {
    if (!user.institutionId) {
      throw new ForbiddenException('El usuario no tiene institución asociada');
    }

    return user.institutionId;
  }

  private toValidationStatus(status: DocumentWorkflowStatus) {
    switch (status) {
      case DocumentWorkflowStatus.APPROVED:
        return ValidationStatus.APPROVED;
      case DocumentWorkflowStatus.REJECTED:
        return ValidationStatus.REJECTED;
      case DocumentWorkflowStatus.PENDING:
      default:
        return ValidationStatus.PENDING;
    }
  }

  private extractDefinitionIdFromKey(key: string) {
    const [, definitionId] = key.split(':');

    if (!definitionId) {
      throw new BadRequestException('Clave documental inválida');
    }

    return definitionId;
  }

  private async syncTeacherLegacyField(
    teacherId: string,
    field: TeacherDocumentField,
    currentFiles: string[],
  ) {
    const data: Record<string, string | string[] | null> = {};

    if (TEACHER_SLOT_DEFINITIONS[field].allowsMultipleFiles) {
      data[field] = currentFiles;
    } else {
      data[field] = currentFiles[0] ?? null;
    }

    return this.prisma.teacher.update({
      where: { id: teacherId },
      data,
    });
  }
}