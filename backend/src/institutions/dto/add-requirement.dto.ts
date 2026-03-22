import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { RequirementType } from '@prisma/client';

export class AddRequirementDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RequirementType)
  @IsNotEmpty()
  type: RequirementType;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresExpiryDate?: boolean;
}