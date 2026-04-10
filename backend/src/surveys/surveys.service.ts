import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import { AssignSurveyToRotationDto } from './dto/assign-survey-to-rotation.dto';
import { ReorderSurveyQuestionsDto } from './dto/reorder-survey-questions.dto';
import { SubmitSurveyResponseDto } from './dto/submit-survey-response.dto';
import { createHash, randomBytes } from 'crypto';
import * as ExcelJS from 'exceljs';
import {
  EntityState,
  SurveyAssignmentStatus,
  SurveyDispatchChannel,
  SurveyDispatchStatus,
  SurveyQuestionType,
  SurveyStatus,
} from '@prisma/client';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async createSurvey(dto: CreateSurveyDto) {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('El nombre de la encuesta es obligatorio.');
    }

    return this.prisma.survey.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        status: dto.status || SurveyStatus.INACTIVE,
        isOpenAccess: !!dto.isOpenAccess,
      },
    });
  }

  async findSurveys(status?: 'ACTIVE' | 'INACTIVE') {
    return this.prisma.survey.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      include: {
        questions: {
          select: { id: true },
        },
        rotations: {
          select: { id: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findSurveyById(id: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id, deletedAt: null },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada.');
    }

    return survey;
  }

  async updateSurvey(id: string, dto: UpdateSurveyDto) {
    await this.ensureSurveyExists(id);

    return this.prisma.survey.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(dto.isOpenAccess !== undefined ? { isOpenAccess: dto.isOpenAccess } : {}),
      },
    });
  }

  async removeSurvey(id: string) {
    await this.ensureSurveyExists(id);

    return this.prisma.survey.update({
      where: { id },
      data: { deletedAt: new Date(), status: SurveyStatus.INACTIVE },
    });
  }

  async publishSurvey(id: string) {
    const survey = await this.findSurveyById(id);
    if (!survey.questions.length) {
      throw new BadRequestException('No se puede publicar una encuesta sin preguntas.');
    }

    return this.prisma.survey.update({
      where: { id },
      data: {
        isPublished: true,
        status: SurveyStatus.ACTIVE,
      },
    });
  }

  async createQuestion(surveyId: string, dto: CreateSurveyQuestionDto) {
    await this.ensureSurveyExists(surveyId);
    this.validateQuestionPayload(dto.type, dto.scaleMin, dto.scaleMax, dto.options);

    const maxOrder = await this.prisma.surveyQuestion.aggregate({
      where: { surveyId },
      _max: { orderIndex: true },
    });

    const orderIndex = dto.orderIndex ?? ((maxOrder._max.orderIndex ?? -1) + 1);

    return this.prisma.surveyQuestion.create({
      data: {
        surveyId,
        title: dto.title?.trim(),
        description: dto.description?.trim() || null,
        type: dto.type,
        isRequired: !!dto.isRequired,
        orderIndex,
        scaleMin: dto.type === SurveyQuestionType.SCALE ? dto.scaleMin ?? 1 : null,
        scaleMax: dto.type === SurveyQuestionType.SCALE ? dto.scaleMax ?? 5 : null,
        scaleStep: dto.type === SurveyQuestionType.SCALE ? dto.scaleStep ?? 1 : null,
        options: dto.options?.length
          ? {
              create: dto.options.map((option, index) => ({
                label: option.label.trim(),
                value: option.value.trim(),
                orderIndex: option.orderIndex ?? index,
              })),
            }
          : undefined,
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async updateQuestion(surveyId: string, questionId: string, dto: UpdateSurveyQuestionDto) {
    const question = await this.prisma.surveyQuestion.findFirst({
      where: { id: questionId, surveyId },
      include: { options: true },
    });

    if (!question) {
      throw new NotFoundException('Pregunta no encontrada.');
    }

    const nextType = dto.type ?? question.type;
    this.validateQuestionPayload(nextType, dto.scaleMin ?? question.scaleMin ?? undefined, dto.scaleMax ?? question.scaleMax ?? undefined, dto.options);

    await this.prisma.$transaction(async (tx) => {
      await tx.surveyQuestion.update({
        where: { id: questionId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
          ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
          scaleMin: nextType === SurveyQuestionType.SCALE ? (dto.scaleMin ?? question.scaleMin ?? 1) : null,
          scaleMax: nextType === SurveyQuestionType.SCALE ? (dto.scaleMax ?? question.scaleMax ?? 5) : null,
          scaleStep: nextType === SurveyQuestionType.SCALE ? (dto.scaleStep ?? question.scaleStep ?? 1) : null,
        },
      });

      if (dto.options) {
        await tx.surveyQuestionOption.deleteMany({ where: { questionId } });
        if (dto.options.length) {
          await tx.surveyQuestionOption.createMany({
            data: dto.options.map((option, index) => ({
              questionId,
              label: option.label.trim(),
              value: option.value.trim(),
              orderIndex: option.orderIndex ?? index,
            })),
          });
        }
      }
    });

    return this.prisma.surveyQuestion.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async removeQuestion(surveyId: string, questionId: string) {
    const exists = await this.prisma.surveyQuestion.findFirst({
      where: { id: questionId, surveyId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Pregunta no encontrada.');
    }

    return this.prisma.surveyQuestion.delete({ where: { id: questionId } });
  }

  async reorderQuestions(surveyId: string, dto: ReorderSurveyQuestionsDto) {
    if (!dto.questions?.length) {
      throw new BadRequestException('Debe enviar al menos una pregunta para reordenar.');
    }

    const ids = dto.questions.map((q) => q.id);
    const existingCount = await this.prisma.surveyQuestion.count({ where: { id: { in: ids }, surveyId } });
    if (existingCount !== ids.length) {
      throw new BadRequestException('Una o más preguntas no pertenecen a la encuesta.');
    }

    await this.prisma.$transaction(
      dto.questions.map((q) =>
        this.prisma.surveyQuestion.update({
          where: { id: q.id },
          data: { orderIndex: q.orderIndex },
        }),
      ),
    );

    return this.findSurveyById(surveyId);
  }

  async assignSurveyToRotation(dto: AssignSurveyToRotationDto) {
    if (!dto.rotationScheduleId || !dto.surveyId) {
      throw new BadRequestException('rotationScheduleId y surveyId son obligatorios.');
    }

    const [survey, rotation] = await Promise.all([
      this.prisma.survey.findFirst({ where: { id: dto.surveyId, deletedAt: null } }),
      this.prisma.rotationSchedule.findUnique({ where: { id: dto.rotationScheduleId } }),
    ]);

    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada.');
    }

    if (!survey.isPublished || survey.status !== SurveyStatus.ACTIVE) {
      throw new BadRequestException('Solo se pueden asignar encuestas publicadas y activas.');
    }

    if (!rotation) {
      throw new NotFoundException('Rotación no encontrada.');
    }

    const studentIds = Array.from(new Set(rotation.studentIds || [])).filter(Boolean);

    const result = await this.prisma.$transaction(async (tx) => {
      const rotationSurvey = await tx.rotationSurvey.upsert({
        where: { rotationScheduleId: dto.rotationScheduleId },
        update: {
          surveyId: dto.surveyId,
          status: EntityState.ACTIVE,
          assignedAt: new Date(),
          sendAfterRotationEnd: dto.sendAfterRotationEnd ?? true,
        },
        create: {
          rotationScheduleId: dto.rotationScheduleId,
          surveyId: dto.surveyId,
          sendAfterRotationEnd: dto.sendAfterRotationEnd ?? true,
        },
      });

      await tx.surveyAssignment.deleteMany({
        where: {
          rotationSurveyId: rotationSurvey.id,
          status: SurveyAssignmentStatus.PENDING,
          response: null,
        },
      });

      if (studentIds.length) {
        await tx.surveyAssignment.createMany({
          data: studentIds.map((studentId) => ({
            rotationSurveyId: rotationSurvey.id,
            studentId,
            tokenHash: this.hashToken(this.generateToken()),
            status: SurveyAssignmentStatus.PENDING,
          })),
          skipDuplicates: true,
        });
      }

      return rotationSurvey;
    });

    return this.getRotationAssignment(result.rotationScheduleId);
  }

  async getRotationAssignment(rotationScheduleId: string) {
    const rotationSurvey = await this.prisma.rotationSurvey.findUnique({
      where: { rotationScheduleId },
      include: {
        survey: {
          select: { id: true, name: true, status: true, isPublished: true },
        },
        assignments: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, document: true, email: true },
            },
            response: {
              select: { id: true, submittedAt: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!rotationSurvey) {
      throw new NotFoundException('La rotación no tiene encuesta asignada.');
    }

    return {
      ...rotationSurvey,
      assignments: rotationSurvey.assignments.map((assignment) => ({
        id: assignment.id,
        status: assignment.status,
        respondedAt: assignment.respondedAt,
        firstSentAt: assignment.firstSentAt,
        sentCount: assignment.sentCount,
        student: {
          id: assignment.student.id,
          name: `${assignment.student.firstName} ${assignment.student.lastName}`.trim(),
          document: assignment.student.document,
          email: assignment.student.email,
        },
      })),
    };
  }

  async getPublicSurveyByToken(token: string) {
    const assignment = await this.findAssignmentByToken(token);

    if (assignment.status === SurveyAssignmentStatus.RESPONDED || assignment.response) {
      throw new BadRequestException('Esta encuesta ya fue respondida.');
    }

    const survey = await this.prisma.survey.findUnique({
      where: { id: assignment.rotationSurvey.surveyId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    if (!survey || !survey.isPublished || survey.status !== SurveyStatus.ACTIVE) {
      throw new BadRequestException('La encuesta no está disponible en este momento.');
    }

    return {
      assignmentId: assignment.id,
      mode: 'ASSIGNMENT',
      student: {
        id: assignment.student.id,
        name: `${assignment.student.firstName} ${assignment.student.lastName}`.trim(),
      },
      rotation: {
        id: assignment.rotationSurvey.rotationScheduleId,
        startDate: assignment.rotationSurvey.rotationSchedule.startDate,
        endDate: assignment.rotationSurvey.rotationSchedule.endDate,
      },
      survey,
    };
  }

  async getOpenAccessSurvey(surveyId: string) {
    const survey = await this.prisma.survey.findFirst({
      where: {
        id: surveyId,
        deletedAt: null,
        isPublished: true,
        status: SurveyStatus.ACTIVE,
        isOpenAccess: true,
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('La encuesta pública no está disponible.');
    }

    return {
      mode: 'OPEN',
      survey,
    };
  }

  async submitPublicSurvey(
    token: string,
    dto: SubmitSurveyResponseDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const assignment = await this.findAssignmentByToken(token);

    if (assignment.status === SurveyAssignmentStatus.RESPONDED || assignment.response) {
      throw new BadRequestException('Esta encuesta ya fue respondida.');
    }

    const survey = await this.prisma.survey.findUnique({
      where: { id: assignment.rotationSurvey.surveyId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!survey || !survey.isPublished || survey.status !== SurveyStatus.ACTIVE) {
      throw new BadRequestException('La encuesta no está disponible en este momento.');
    }

    if (!dto.answers?.length) {
      throw new BadRequestException('Debe enviar al menos una respuesta.');
    }

    const answerByQuestion = new Map(dto.answers.map((a) => [a.questionId, a]));

    for (const question of survey.questions) {
      const answer = answerByQuestion.get(question.id);
      if (question.isRequired && !this.hasMeaningfulAnswer(answer)) {
        throw new BadRequestException(`La pregunta obligatoria "${question.title}" no fue respondida.`);
      }

      if (!answer) {
        continue;
      }

      this.validateAnswerByType(question, answer);
    }

    const response = await this.prisma.$transaction(async (tx) => {
      const createdResponse = await tx.surveyResponse.create({
        data: {
          assignmentId: assignment.id,
          rotationSurveyId: assignment.rotationSurveyId,
          surveyId: assignment.rotationSurvey.surveyId,
          studentId: assignment.studentId,
          rotationScheduleId: assignment.rotationSurvey.rotationScheduleId,
          ipAddress,
          userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
        },
      });

      const detailsData = dto.answers
        .filter((a) => survey.questions.some((q) => q.id === a.questionId))
        .map((a) => ({
          responseId: createdResponse.id,
          questionId: a.questionId,
          answerText: a.answerText ?? null,
          answerNumber: a.answerNumber ?? null,
          answerOptionsJson: Array.isArray(a.answerOptions) ? a.answerOptions : undefined,
        }));

      if (detailsData.length) {
        await tx.surveyResponseDetail.createMany({ data: detailsData });
      }

      await tx.surveyAssignment.update({
        where: { id: assignment.id },
        data: {
          status: SurveyAssignmentStatus.RESPONDED,
          respondedAt: new Date(),
        },
      });

      return createdResponse;
    });

    return {
      message: 'Encuesta respondida correctamente.',
      responseId: response.id,
      submittedAt: response.submittedAt,
    };
  }

  async submitOpenAccessSurvey(
    surveyId: string,
    dto: SubmitSurveyResponseDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const survey = await this.prisma.survey.findFirst({
      where: {
        id: surveyId,
        deletedAt: null,
        isPublished: true,
        status: SurveyStatus.ACTIVE,
        isOpenAccess: true,
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('La encuesta pública no está disponible.');
    }

    if (!dto.answers?.length) {
      throw new BadRequestException('Debe enviar al menos una respuesta.');
    }

    const answerByQuestion = new Map(dto.answers.map((a) => [a.questionId, a]));

    for (const question of survey.questions) {
      const answer = answerByQuestion.get(question.id);
      if (question.isRequired && !this.hasMeaningfulAnswer(answer)) {
        throw new BadRequestException(`La pregunta obligatoria "${question.title}" no fue respondida.`);
      }

      if (!answer) {
        continue;
      }

      this.validateAnswerByType(question, answer);
    }

    const response = await this.prisma.$transaction(async (tx) => {
      const createdResponse = await tx.surveyResponse.create({
        data: {
          surveyId: survey.id,
          ipAddress,
          userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
        },
      });

      const detailsData = dto.answers
        .filter((a) => survey.questions.some((q) => q.id === a.questionId))
        .map((a) => ({
          responseId: createdResponse.id,
          questionId: a.questionId,
          answerText: a.answerText ?? null,
          answerNumber: a.answerNumber ?? null,
          answerOptionsJson: Array.isArray(a.answerOptions) ? a.answerOptions : undefined,
        }));

      if (detailsData.length) {
        await tx.surveyResponseDetail.createMany({ data: detailsData });
      }

      return createdResponse;
    });

    return {
      message: 'Encuesta pública respondida correctamente.',
      responseId: response.id,
      submittedAt: response.submittedAt,
    };
  }

  async getSurveyStats(surveyId: string) {
    await this.ensureSurveyExists(surveyId);

    const [rotationLinks, responses, questions] = await Promise.all([
      this.prisma.rotationSurvey.findMany({
        where: { surveyId },
        include: {
          assignments: {
            select: { id: true, status: true },
          },
        },
      }),
      this.prisma.surveyResponse.findMany({
        where: { surveyId },
        include: {
          details: true,
        },
      }),
      this.prisma.surveyQuestion.findMany({
        where: { surveyId },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
        },
        orderBy: { orderIndex: 'asc' },
      }),
    ]);

    const totalAssignments = rotationLinks.reduce((acc, link) => acc + link.assignments.length, 0);
    const respondedAssignments = rotationLinks.reduce(
      (acc, link) => acc + link.assignments.filter((a) => a.status === SurveyAssignmentStatus.RESPONDED).length,
      0,
    );
    const participation = totalAssignments ? Number(((respondedAssignments / totalAssignments) * 100).toFixed(2)) : 0;

    const questionResults = questions.map((question) => {
      const details = responses.flatMap((r) => r.details.filter((d) => d.questionId === question.id));

      if (
        question.type === SurveyQuestionType.SINGLE_CHOICE ||
        question.type === SurveyQuestionType.DROPDOWN ||
        question.type === SurveyQuestionType.MULTIPLE_CHOICE
      ) {
        const counts = new Map<string, number>();
        for (const option of question.options) {
          counts.set(option.value, 0);
        }

        for (const detail of details) {
          const selected = Array.isArray(detail.answerOptionsJson)
            ? (detail.answerOptionsJson as unknown as string[])
            : detail.answerText
            ? [detail.answerText]
            : [];

          for (const value of selected) {
            counts.set(value, (counts.get(value) || 0) + 1);
          }
        }

        return {
          questionId: question.id,
          title: question.title,
          type: question.type,
          totalAnswers: details.length,
          options: question.options.map((option) => ({
            label: option.label,
            value: option.value,
            count: counts.get(option.value) || 0,
          })),
        };
      }

      if (question.type === SurveyQuestionType.SCALE) {
        const values = details
          .map((detail) => detail.answerNumber)
          .filter((value): value is number => typeof value === 'number');

        const avg = values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0;

        return {
          questionId: question.id,
          title: question.title,
          type: question.type,
          totalAnswers: values.length,
          average: avg,
          min: question.scaleMin,
          max: question.scaleMax,
        };
      }

      return {
        questionId: question.id,
        title: question.title,
        type: question.type,
        totalAnswers: details.length,
        texts: details.map((detail) => detail.answerText).filter((t): t is string => !!t),
      };
    });

    return {
      surveyId,
      totalAssignments,
      respondedAssignments,
      pendingAssignments: Math.max(totalAssignments - respondedAssignments, 0),
      participation,
      totalResponses: responses.length,
      questionResults,
    };
  }

  async exportSurveyResponsesXlsx(surveyId: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, deletedAt: null },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: { orderBy: { orderIndex: 'asc' } },
          },
        },
        responses: {
          orderBy: { submittedAt: 'asc' },
          include: {
            student: {
              include: {
                institution: {
                  select: { name: true },
                },
              },
            },
            rotationSchedule: {
              select: {
                startDate: true,
                endDate: true,
              },
            },
            details: true,
          },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada.');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resultados');

    const questionColumns = survey.questions.map((question) => ({
      header: question.title,
      key: question.id,
      width: Math.min(Math.max(question.title.length + 8, 24), 48),
    }));

    worksheet.columns = [
      { header: 'Fecha de respuesta', key: 'submittedAt', width: 22 },
      { header: 'Estudiante', key: 'studentName', width: 28 },
      { header: 'Documento', key: 'studentDocument', width: 18 },
      { header: 'Correo', key: 'studentEmail', width: 30 },
      { header: 'Institución', key: 'institutionName', width: 28 },
      { header: 'Inicio rotación', key: 'rotationStartDate', width: 18 },
      { header: 'Fin rotación', key: 'rotationEndDate', width: 18 },
      ...questionColumns,
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };

    for (const response of survey.responses) {
      const answerMap = new Map(response.details.map((detail) => [detail.questionId, detail]));

      const rowData: Record<string, string | number | null> = {
        submittedAt: this.formatDateTime(response.submittedAt),
        studentName: response.student ? `${response.student.firstName} ${response.student.lastName}`.trim() : 'Acceso abierto',
        studentDocument: response.student?.document || null,
        studentEmail: response.student?.email || null,
        institutionName: response.student?.institution?.name || null,
        rotationStartDate: response.rotationSchedule?.startDate ? this.formatDate(response.rotationSchedule.startDate) : null,
        rotationEndDate: response.rotationSchedule?.endDate ? this.formatDate(response.rotationSchedule.endDate) : null,
      };

      for (const question of survey.questions) {
        rowData[question.id] = this.formatSurveyAnswer(answerMap.get(question.id));
      }

      worksheet.addRow(rowData);
    }

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    return {
      filename: this.buildSurveyResultsFilename(survey.name),
      buffer: (await workbook.xlsx.writeBuffer()) as unknown as Buffer,
    };
  }

  private formatSurveyAnswer(detail?: {
    answerText: string | null;
    answerNumber: number | null;
    answerOptionsJson: unknown;
  }) {
    if (!detail) {
      return '';
    }

    if (Array.isArray(detail.answerOptionsJson)) {
      return detail.answerOptionsJson.map((value) => String(value)).join(', ');
    }

    if (typeof detail.answerNumber === 'number') {
      return detail.answerNumber;
    }

    return detail.answerText || '';
  }

  private formatDateTime(value: Date) {
    return value.toLocaleString('es-CO');
  }

  private formatDate(value: Date) {
    return value.toLocaleDateString('es-CO');
  }

  private buildSurveyResultsFilename(name: string) {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'encuesta';

    return `resultados-${slug}.xlsx`;
  }

  async dispatchDueAssignments() {
    const now = new Date();

    const pendingAssignments = await this.prisma.surveyAssignment.findMany({
      where: {
        status: SurveyAssignmentStatus.PENDING,
        firstSentAt: null,
        rotationSurvey: {
          status: EntityState.ACTIVE,
          sendAfterRotationEnd: true,
          rotationSchedule: {
            endDate: {
              lte: now,
            },
          },
          survey: {
            deletedAt: null,
            isPublished: true,
            status: SurveyStatus.ACTIVE,
          },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: 500,
    });

    const results: Array<{ assignmentId: string; studentEmail: string; link: string }> = [];

    for (const assignment of pendingAssignments) {
      const token = this.generateToken();
      const tokenHash = this.hashToken(token);
      const link = this.buildPublicSurveyLink(token);

      await this.prisma.$transaction(async (tx) => {
        await tx.surveyAssignment.update({
          where: { id: assignment.id },
          data: {
            tokenHash,
            firstSentAt: now,
            lastSentAt: now,
            sentCount: { increment: 1 },
          },
        });

        await tx.surveyDispatchLog.create({
          data: {
            assignmentId: assignment.id,
            channel: SurveyDispatchChannel.EMAIL,
            status: SurveyDispatchStatus.SENT,
          },
        });
      });

      results.push({
        assignmentId: assignment.id,
        studentEmail: assignment.student.email,
        link,
      });
    }

    return {
      processed: pendingAssignments.length,
      sent: results.length,
      items: results,
    };
  }

  async resendAssignment(assignmentId: string) {
    const assignment = await this.prisma.surveyAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada.');
    }

    if (assignment.status === SurveyAssignmentStatus.RESPONDED) {
      throw new BadRequestException('No se puede reenviar una encuesta ya respondida.');
    }

    const now = new Date();
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const link = this.buildPublicSurveyLink(token);

    await this.prisma.$transaction(async (tx) => {
      await tx.surveyAssignment.update({
        where: { id: assignment.id },
        data: {
          tokenHash,
          lastSentAt: now,
          firstSentAt: assignment.firstSentAt ?? now,
          sentCount: { increment: 1 },
        },
      });

      await tx.surveyDispatchLog.create({
        data: {
          assignmentId: assignment.id,
          channel: SurveyDispatchChannel.EMAIL,
          status: SurveyDispatchStatus.SENT,
        },
      });
    });

    return {
      assignmentId: assignment.id,
      studentEmail: assignment.student.email,
      link,
      message: 'Enlace regenerado correctamente.',
    };
  }

  private async ensureSurveyExists(surveyId: string) {
    const survey = await this.prisma.survey.findFirst({ where: { id: surveyId, deletedAt: null }, select: { id: true } });
    if (!survey) {
      throw new NotFoundException('Encuesta no encontrada.');
    }
  }

  private validateQuestionPayload(
    type: SurveyQuestionType | string,
    scaleMin?: number,
    scaleMax?: number,
    options?: Array<{ label: string; value: string }>,
  ) {
    if (
      (type === SurveyQuestionType.SINGLE_CHOICE || type === SurveyQuestionType.MULTIPLE_CHOICE || type === SurveyQuestionType.DROPDOWN) &&
      (!options || !options.length)
    ) {
      throw new BadRequestException('Las preguntas de selección deben tener opciones.');
    }

    if (type === SurveyQuestionType.SCALE) {
      const min = scaleMin ?? 1;
      const max = scaleMax ?? 5;
      if (max <= min) {
        throw new BadRequestException('La escala debe tener un rango válido.');
      }
    }
  }

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  private buildPublicSurveyLink(token: string) {
    const baseUrl = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:4200';
    return `${baseUrl}/public/surveys/${token}`;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async findAssignmentByToken(token: string) {
    const tokenHash = this.hashToken(token);

    const assignment = await this.prisma.surveyAssignment.findUnique({
      where: { tokenHash },
      include: {
        response: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        rotationSurvey: {
          include: {
            rotationSchedule: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Token inválido o no encontrado.');
    }

    if (assignment.tokenExpiresAt && assignment.tokenExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Este enlace ya expiró.');
    }

    return assignment;
  }

  private hasMeaningfulAnswer(answer?: {
    answerText?: string;
    answerNumber?: number;
    answerOptions?: string[];
  }) {
    if (!answer) {
      return false;
    }

    if (answer.answerText !== undefined && answer.answerText !== null && String(answer.answerText).trim().length > 0) {
      return true;
    }

    if (typeof answer.answerNumber === 'number') {
      return true;
    }

    if (Array.isArray(answer.answerOptions) && answer.answerOptions.length > 0) {
      return true;
    }

    return false;
  }

  private validateAnswerByType(
    question: {
      id: string;
      title: string;
      type: SurveyQuestionType;
      scaleMin: number | null;
      scaleMax: number | null;
      options: Array<{ value: string }>;
    },
    answer: {
      questionId: string;
      answerText?: string;
      answerNumber?: number;
      answerOptions?: string[];
    },
  ) {
    if (question.type === SurveyQuestionType.SHORT_TEXT || question.type === SurveyQuestionType.LONG_TEXT) {
      if (answer.answerText !== undefined && typeof answer.answerText !== 'string') {
        throw new BadRequestException(`La respuesta de la pregunta "${question.title}" debe ser texto.`);
      }
      return;
    }

    if (question.type === SurveyQuestionType.SCALE) {
      if (typeof answer.answerNumber !== 'number') {
        throw new BadRequestException(`La pregunta "${question.title}" debe responderse con un valor numérico.`);
      }
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 5;
      if (answer.answerNumber < min || answer.answerNumber > max) {
        throw new BadRequestException(`La pregunta "${question.title}" debe estar entre ${min} y ${max}.`);
      }
      return;
    }

    const allowedValues = new Set(question.options.map((option) => option.value));

    if (question.type === SurveyQuestionType.SINGLE_CHOICE || question.type === SurveyQuestionType.DROPDOWN) {
      if (!Array.isArray(answer.answerOptions) || answer.answerOptions.length !== 1) {
        throw new BadRequestException(`La pregunta "${question.title}" permite una sola opción.`);
      }
      if (!allowedValues.has(answer.answerOptions[0])) {
        throw new BadRequestException(`La pregunta "${question.title}" contiene una opción inválida.`);
      }
      return;
    }

    if (question.type === SurveyQuestionType.MULTIPLE_CHOICE) {
      if (!Array.isArray(answer.answerOptions)) {
        throw new BadRequestException(`La pregunta "${question.title}" requiere opciones múltiples.`);
      }
      for (const option of answer.answerOptions) {
        if (!allowedValues.has(option)) {
          throw new BadRequestException(`La pregunta "${question.title}" contiene una opción inválida.`);
        }
      }
    }
  }
}
