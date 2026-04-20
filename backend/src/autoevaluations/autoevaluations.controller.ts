import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AutoevaluationsService } from './autoevaluations.service';
import { OpenAutoevaluationProcessDto } from './dto/open-autoevaluation-process.dto';
import { SaveAutoevaluationDraftDto } from './dto/save-autoevaluation-draft.dto';
import { ReviewAutoevaluationProcessDto } from './dto/review-autoevaluation-process.dto';
import { UploadEvidenceDto } from './dto/upload-evidence.dto';

const evidenceStorage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/autoevaluations-evidences/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = file.originalname.split('.').pop();
    cb(null, `${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`);
  },
});

@Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
@Controller('autoevaluations')
export class AutoevaluationsController {
  constructor(private readonly service: AutoevaluationsService) {}

  @Get('catalog')
  getCatalog() {
    return this.service.getCatalog();
  }

  @Get('processes')
  listProcesses(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('period', new ParseIntPipe({ optional: true })) period?: number,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.service.listProcesses(user, { year, period, institutionId });
  }

  @Get('processes/:id')
  getProcessById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getProcessById(user, id);
  }

  @Get('processes/:id/audit-log')
  getProcessAuditLog(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getProcessAuditLog(user, id);
  }

  @Post('processes')
  openProcess(@CurrentUser() user: AuthenticatedUser, @Body() dto: OpenAutoevaluationProcessDto) {
    return this.service.openProcess(user, dto);
  }

  @Put('processes/:id/draft')
  saveDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SaveAutoevaluationDraftDto,
  ) {
    return this.service.saveDraft(user, id, dto);
  }

  @Post('processes/:id/submit')
  submitProcess(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.submitProcess(user, id);
  }

  @Post('processes/:id/review')
  @Roles(UserRole.HOSPITAL)
  reviewProcess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewAutoevaluationProcessDto,
  ) {
    return this.service.reviewProcess(user, id, dto);
  }

  @Post('scores/:scoreId/evidences')
  @UseInterceptors(FileInterceptor('file', { storage: evidenceStorage }))
  uploadEvidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scoreId') scoreId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadEvidenceDto,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return this.service.uploadEvidence(user, scoreId, file, dto.description);
  }

  @Get('scores/:scoreId/evidences')
  getScoreEvidences(@CurrentUser() user: AuthenticatedUser, @Param('scoreId') scoreId: string) {
    return this.service.getScoreEvidences(user, scoreId);
  }

  @Delete('evidences/:evidenceId')
  deleteEvidence(@CurrentUser() user: AuthenticatedUser, @Param('evidenceId') evidenceId: string) {
    return this.service.deleteEvidence(user, evidenceId);
  }
}
