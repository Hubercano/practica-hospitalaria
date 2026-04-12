import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { SubmitDocumentValueDto } from './dto/submit-document-value.dto';
import { DocumentsService } from './documents.service';

@Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {
    if (!fs.existsSync('./uploads/documents')) {
      fs.mkdirSync('./uploads/documents', { recursive: true });
    }
  }

  @Post('slots/:slotId/submit')
  submitValue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slotId') slotId: string,
    @Body() dto: SubmitDocumentValueDto,
  ) {
    return this.documentsService.submitDocumentValue(slotId, dto, user);
  }

  @Post('slots/:slotId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${req.params.slotId}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slotId') slotId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('expiryDate') expiryDate?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo no subido');
    }

    return this.documentsService.uploadInstitutionRequirementFile(slotId, file, expiryDate, user);
  }

  @Patch('slots/:slotId/review')
  @Roles(UserRole.HOSPITAL)
  reviewCurrentVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slotId') slotId: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.documentsService.reviewCurrentVersion(slotId, dto, user);
  }

  @Patch('versions/:versionId/review')
  @Roles(UserRole.HOSPITAL)
  reviewVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.documentsService.reviewVersion(versionId, dto, user);
  }

  @Get('slots/:slotId/history')
  @Roles(UserRole.HOSPITAL)
  getHistory(@CurrentUser() user: AuthenticatedUser, @Param('slotId') slotId: string) {
    return this.documentsService.getSlotHistory(slotId, user);
  }
}