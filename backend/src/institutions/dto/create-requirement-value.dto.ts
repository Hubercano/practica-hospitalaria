// src/institutions/dto/create-requirement-value.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateRequirementValueDto {
  @IsString()
  @IsNotEmpty()
  definitionId: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}