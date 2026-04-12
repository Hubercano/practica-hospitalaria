import { DocumentWorkflowStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ReviewDocumentDto {
  @IsEnum(DocumentWorkflowStatus)
  status!: DocumentWorkflowStatus;

  @ValidateIf((dto: ReviewDocumentDto) => dto.status === DocumentWorkflowStatus.REJECTED)
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}