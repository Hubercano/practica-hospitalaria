import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AutoevaluationActionStatus,
  AutoevaluationProcessStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { OpenAutoevaluationProcessDto } from './dto/open-autoevaluation-process.dto';
import {
  SaveAutoevaluationActionDto,
  SaveAutoevaluationDraftDto,
} from './dto/save-autoevaluation-draft.dto';
import { ReviewAutoevaluationProcessDto } from './dto/review-autoevaluation-process.dto';

type AutoevaluationProcessPayload = Prisma.AutoevaluationProcessGetPayload<{
  include: {
    institution: { select: { id: true; name: true } };
    teachingServiceCommittee: { select: { id: true; year: true; committeeNumber: true; date: true } };
    scores: {
      include: {
        criterion: {
          include: {
            factor: { select: { id: true; name: true; orderIndex: true } };
          };
        };
      };
    };
    actions: true;
  };
}>;

@Injectable()
export class AutoevaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog() {
    const factors = await this.prisma.autoevaluationFactor.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      include: {
        criteria: {
          where: { deletedAt: null, isActive: true },
          orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
        },
      },
    });

    return {
      factors: factors.map((factor) => ({
        id: factor.id,
        name: factor.name,
        description: factor.description,
        orderIndex: factor.orderIndex,
        criteria: factor.criteria.map((criterion) => ({
          id: criterion.id,
          name: criterion.name,
          description: criterion.description,
          verificationMechanism: criterion.description,
          weight: criterion.weight,
          orderIndex: criterion.orderIndex,
        })),
      })),
    };
  }

  async listProcesses(
    user: AuthenticatedUser,
    filters: { year?: number; period?: number; institutionId?: string },
  ) {
    const institutionId = this.resolveInstitutionFilter(user, filters.institutionId);

    return this.prisma.autoevaluationProcess.findMany({
      where: {
        deletedAt: null,
        ...(filters.year ? { year: filters.year } : {}),
        ...(filters.period ? { period: filters.period } : {}),
        ...(institutionId ? { institutionId } : {}),
      },
      include: {
        institution: { select: { id: true, name: true } },
        teachingServiceCommittee: {
          select: { id: true, year: true, committeeNumber: true, date: true },
        },
        _count: { select: { scores: true, actions: true } },
      },
      orderBy: [{ year: 'desc' }, { period: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getProcessById(user: AuthenticatedUser, id: string) {
    const process = await this.findProcessForAccess(id, user);
    return this.toProcessResponse(process);
  }

  async openProcess(user: AuthenticatedUser, dto: OpenAutoevaluationProcessDto) {
    const institutionId = this.resolveInstitutionFilter(user, dto.institutionId);

     if (!institutionId) {
       throw new BadRequestException('Debe especificar una institución.');
     }

     const validatedInstitutionId = institutionId as string;

      await this.ensureInstitutionExists(validatedInstitutionId);
      await this.ensureCommitteeBelongsToInstitution(dto.teachingServiceCommitteeId, validatedInstitutionId);

    const process = await this.prisma.autoevaluationProcess.upsert({
      where: {
        institutionId_year_period: {
            institutionId: validatedInstitutionId,
          year: dto.year,
          period: dto.period,
        },
      },
      update: {
        teachingServiceCommitteeId: dto.teachingServiceCommitteeId || null,
        deletedAt: null,
      },
      create: {
          institutionId: validatedInstitutionId,
        year: dto.year,
        period: dto.period,
        teachingServiceCommitteeId: dto.teachingServiceCommitteeId || null,
      },
      include: {
        institution: { select: { id: true, name: true } },
        teachingServiceCommittee: {
          select: { id: true, year: true, committeeNumber: true, date: true },
        },
        scores: {
          include: {
            criterion: {
              include: {
                factor: { select: { id: true, name: true, orderIndex: true } },
              },
            },
          },
        },
        actions: true,
      },
    });

    return this.toProcessResponse(process);
  }

  async saveDraft(user: AuthenticatedUser, id: string, dto: SaveAutoevaluationDraftDto) {
    const process = await this.findProcessForAccess(id, user);

     if (process.status === AutoevaluationProcessStatus.APPROVED || process.status === AutoevaluationProcessStatus.CLOSED) {
      throw new BadRequestException('No se puede editar un proceso aprobado o cerrado.');
    }

    if (dto.scores?.length) {
      await this.ensureCriteriaExist(dto.scores.map((item) => item.criterionId));
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.autoevaluationProcess.update({
        where: { id },
        data: {
          ...(dto.strengths !== undefined ? { strengths: this.trimOrNull(dto.strengths) } : {}),
          ...(dto.opportunities !== undefined ? { opportunities: this.trimOrNull(dto.opportunities) } : {}),
          ...(dto.conclusions !== undefined ? { conclusions: this.trimOrNull(dto.conclusions) } : {}),
          ...(process.status === AutoevaluationProcessStatus.SUBMITTED || process.status === AutoevaluationProcessStatus.IN_REVIEW
            ? { status: AutoevaluationProcessStatus.DRAFT }
            : {}),
        },
      });

      if (dto.scores) {
        for (const score of dto.scores) {
          await tx.autoevaluationCriterionScore.upsert({
            where: {
              processId_criterionId: {
                processId: id,
                criterionId: score.criterionId,
              },
            },
            update: {
              score: score.score,
              evidence: this.trimOrNull(score.evidence),
              improvementNotes: this.trimOrNull(score.improvementNotes),
            },
            create: {
              processId: id,
              criterionId: score.criterionId,
              score: score.score,
              evidence: this.trimOrNull(score.evidence),
              improvementNotes: this.trimOrNull(score.improvementNotes),
            },
          });
        }
      }

      if (dto.actions) {
        await this.syncActions(tx, id, dto.actions);
      }

      const allScores = await tx.autoevaluationCriterionScore.findMany({
        where: { processId: id },
        select: { score: true },
      });

      const average = allScores.length
        ? Number((allScores.reduce((acc, item) => acc + Number(item.score || 0), 0) / allScores.length).toFixed(2))
        : null;

      const compliance = average === null ? null : Number(((average / 5) * 100).toFixed(2));

      await tx.autoevaluationProcess.update({
        where: { id },
        data: {
          globalScore: average,
          compliancePercentage: compliance,
        },
      });
    });

    return this.getProcessById(user, id);
  }

  async submitProcess(user: AuthenticatedUser, id: string) {
    const process = await this.findProcessForAccess(id, user);

    if (process.status === AutoevaluationProcessStatus.CLOSED) {
      throw new BadRequestException('No se puede enviar un proceso cerrado.');
    }

    const scoreCount = await this.prisma.autoevaluationCriterionScore.count({ where: { processId: id } });
    if (!scoreCount) {
      throw new BadRequestException('Debe registrar al menos un criterio evaluado antes de enviar.');
    }

    await this.prisma.autoevaluationProcess.update({
      where: { id },
      data: {
        status: AutoevaluationProcessStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    return this.getProcessById(user, id);
  }

  async reviewProcess(user: AuthenticatedUser, id: string, dto: ReviewAutoevaluationProcessDto) {
    if (user.role !== UserRole.HOSPITAL) {
      throw new ForbiddenException('Solo el hospital puede revisar autoevaluaciones.');
    }

    const process = await this.prisma.autoevaluationProcess.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!process) {
      throw new NotFoundException('Proceso de autoevaluacion no encontrado.');
    }

    if (
      !(
        dto.status === AutoevaluationProcessStatus.IN_REVIEW ||
        dto.status === AutoevaluationProcessStatus.APPROVED ||
        dto.status === AutoevaluationProcessStatus.CLOSED
      )
    ) {
      throw new BadRequestException('El estado de revision no es valido para esta operacion.');
    }

    await this.prisma.autoevaluationProcess.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
        reviewedBy: user.id,
        ...(dto.reviewNotes !== undefined ? { conclusions: this.trimOrNull(dto.reviewNotes) } : {}),
      },
    });

    return this.getProcessById(user, id);
  }

  private resolveInstitutionFilter(user: AuthenticatedUser, institutionId?: string) {
    if (user.role === UserRole.INSTITUCION) {
      if (!user.institutionId) {
        throw new ForbiddenException('El usuario institucional no tiene institucion asociada.');
      }

      if (institutionId && institutionId !== user.institutionId) {
        throw new ForbiddenException('No puede operar sobre otra institucion.');
      }

      return user.institutionId;
    }

    if (!institutionId) {
      return undefined;
    }

    return institutionId;
  }

  private async findProcessForAccess(id: string, user: AuthenticatedUser) {
    const process = await this.prisma.autoevaluationProcess.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(user.role === UserRole.INSTITUCION ? { institutionId: this.resolveInstitutionFilter(user) } : {}),
      },
      include: {
        institution: { select: { id: true, name: true } },
        teachingServiceCommittee: {
          select: { id: true, year: true, committeeNumber: true, date: true },
        },
        scores: {
          include: {
            criterion: {
              include: {
                factor: { select: { id: true, name: true, orderIndex: true } },
              },
            },
          },
          orderBy: [{ criterion: { factor: { orderIndex: 'asc' } } }, { criterion: { orderIndex: 'asc' } }],
        },
        actions: {
          where: { deletedAt: null },
          orderBy: [{ status: 'asc' }, { targetDate: 'asc' }, { updatedAt: 'desc' }],
        },
      },
    });

    if (!process) {
      throw new NotFoundException('Proceso de autoevaluacion no encontrado.');
    }

    return process;
  }

  private async ensureInstitutionExists(institutionId: string) {
    const institution = await this.prisma.institution.findFirst({
      where: { id: institutionId, deletedAt: null },
      select: { id: true },
    });

    if (!institution) {
      throw new BadRequestException('La institucion seleccionada no existe.');
    }
  }

  private async ensureCommitteeBelongsToInstitution(committeeId: string | undefined, institutionId: string) {
    if (!committeeId) {
      return;
    }

    const committee = await this.prisma.teachingServiceCommittee.findFirst({
      where: {
        id: committeeId,
        institutionId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!committee) {
      throw new BadRequestException('El comite seleccionado no pertenece a la institucion.');
    }
  }

  private async ensureCriteriaExist(criterionIds: string[]) {
    const uniqueIds = Array.from(new Set(criterionIds));
    const count = await this.prisma.autoevaluationCriterion.count({
      where: {
        id: { in: uniqueIds },
        deletedAt: null,
        isActive: true,
      },
    });

    if (count !== uniqueIds.length) {
      throw new BadRequestException('Uno o mas criterios de evaluacion no son validos.');
    }
  }

  private async syncActions(
    tx: Prisma.TransactionClient,
    processId: string,
    actions: SaveAutoevaluationActionDto[],
  ) {
    const keepIds: string[] = [];

    for (const action of actions) {
      const normalizedStatus = this.normalizeActionStatus(action.status);
      const normalizedTargetDate = this.normalizeDate(action.targetDate);

      if (action.id) {
        const updated = await tx.autoevaluationImprovementAction.updateMany({
          where: {
            id: action.id,
            processId,
          },
          data: {
            title: action.title.trim(),
            description: this.trimOrNull(action.description),
            responsible: this.trimOrNull(action.responsible),
            targetDate: normalizedTargetDate,
            progress: action.progress ?? 0,
            status: normalizedStatus,
            deletedAt: null,
          },
        });

        if (!updated.count) {
          throw new BadRequestException('Una accion de mejora no pertenece al proceso actual.');
        }

        keepIds.push(action.id);
      } else {
        const created = await tx.autoevaluationImprovementAction.create({
          data: {
            processId,
            title: action.title.trim(),
            description: this.trimOrNull(action.description),
            responsible: this.trimOrNull(action.responsible),
            targetDate: normalizedTargetDate,
            progress: action.progress ?? 0,
            status: normalizedStatus,
          },
          select: { id: true },
        });

        keepIds.push(created.id);
      }
    }

    if (!keepIds.length) {
      await tx.autoevaluationImprovementAction.updateMany({
        where: { processId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return;
    }

    await tx.autoevaluationImprovementAction.updateMany({
      where: {
        processId,
        deletedAt: null,
        id: { notIn: keepIds },
      },
      data: { deletedAt: new Date() },
    });
  }

  private normalizeActionStatus(status?: string) {
    if (!status) {
      return AutoevaluationActionStatus.PLANNED;
    }

    if (!(status in AutoevaluationActionStatus)) {
      throw new BadRequestException('El estado de accion no es valido.');
    }

    return status as AutoevaluationActionStatus;
  }

  private normalizeDate(value?: string) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('La fecha objetivo no tiene formato valido.');
    }

    return parsed;
  }

  private trimOrNull(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private toProcessResponse(process: AutoevaluationProcessPayload) {
    return {
      id: process.id,
      institution: process.institution,
      year: process.year,
      period: process.period,
      status: process.status,
      teachingServiceCommittee: process.teachingServiceCommittee,
      strengths: process.strengths,
      opportunities: process.opportunities,
      conclusions: process.conclusions,
      globalScore: process.globalScore,
      compliancePercentage: process.compliancePercentage,
      submittedAt: process.submittedAt,
      reviewedAt: process.reviewedAt,
      reviewedBy: process.reviewedBy,
      scores: process.scores.map((item) => ({
        id: item.id,
        criterionId: item.criterionId,
        criterionName: item.criterion.name,
        criterionWeight: item.criterion.weight,
        factorId: item.criterion.factor.id,
        factorName: item.criterion.factor.name,
        score: item.score,
        evidence: item.evidence,
        improvementNotes: item.improvementNotes,
      })),
      actions: process.actions.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        responsible: item.responsible,
        targetDate: item.targetDate,
        progress: item.progress,
        status: item.status,
      })),
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
    };
  }

  async uploadEvidence(
    user: AuthenticatedUser,
    scoreId: string,
    file: Express.Multer.File,
    description?: string,
  ) {
    const score = await this.prisma.autoevaluationCriterionScore.findFirst({
      where: { id: scoreId },
      include: { process: true },
    });

    if (!score) {
      throw new NotFoundException('Score no encontrado.');
    }

    if (score.process.deletedAt) {
      throw new BadRequestException('El proceso ha sido eliminado.');
    }

    const process = await this.findProcessForAccess(score.processId, user);

    if (!this.canEditProcess(process)) {
      throw new ForbiddenException('No puede editar este proceso.');
    }

    const evidenceFile = await this.prisma.autoevaluationEvidenceFile.create({
      data: {
        scoreId,
        fileUrl: `/uploads/autoevaluations-evidences/${file.filename}`,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: user.id,
        description: this.trimOrNull(description),
      },
    });

    await this.logAuditAction(score.processId, user.id, 'uploadEvidence', 'evidence', evidenceFile.id);

    return evidenceFile;
  }

  async getScoreEvidences(user: AuthenticatedUser, scoreId: string) {
    const score = await this.prisma.autoevaluationCriterionScore.findFirst({
      where: { id: scoreId },
      include: { process: true },
    });

    if (!score) {
      throw new NotFoundException('Score no encontrado.');
    }

    await this.findProcessForAccess(score.processId, user);

    return this.prisma.autoevaluationEvidenceFile.findMany({
      where: { scoreId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async deleteEvidence(user: AuthenticatedUser, evidenceFileId: string) {
    const evidence = await this.prisma.autoevaluationEvidenceFile.findFirst({
      where: { id: evidenceFileId },
      include: { score: { include: { process: true } } },
    });

    if (!evidence) {
      throw new NotFoundException('Evidencia no encontrada.');
    }

    const process = await this.findProcessForAccess(evidence.score.processId, user);

    if (!this.canEditProcess(process)) {
      throw new ForbiddenException('No puede eliminar evidencias en este proceso.');
    }

    await this.prisma.autoevaluationEvidenceFile.update({
      where: { id: evidenceFileId },
      data: { deletedAt: new Date() },
    });

    await this.logAuditAction(process.id, user.id, 'deleteEvidence', 'evidence', evidenceFileId);
  }

  async getProcessAuditLog(user: AuthenticatedUser, processId: string) {
    const process = await this.findProcessForAccess(processId, user);

    return this.prisma.autoevaluationAuditLog.findMany({
      where: { processId: process.id },
      orderBy: { performedAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        changes: true,
        performedBy: true,
        performedAt: true,
      },
    });
  }

  private canEditProcess(process: AutoevaluationProcessPayload) {
    return process.status !== AutoevaluationProcessStatus.APPROVED && process.status !== AutoevaluationProcessStatus.CLOSED;
  }

  private async logAuditAction(processId: string, userId: string, action: string, entityType: string, entityId?: string) {
    await this.prisma.autoevaluationAuditLog.create({
      data: {
        processId,
        action,
        entityType,
        entityId,
        performedBy: userId,
      },
    });
  }
}
