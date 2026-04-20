import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AutoevaluationProcessStatus } from '@prisma/client';

export class ReviewAutoevaluationProcessDto {
  @IsEnum(AutoevaluationProcessStatus)
  status!: AutoevaluationProcessStatus;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  reviewNotes?: string;
}
