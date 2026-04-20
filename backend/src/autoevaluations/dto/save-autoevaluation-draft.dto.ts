import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaveAutoevaluationScoreDto {
  @IsUUID()
  criterionId!: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  evidence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  improvementNotes?: string;
}

export class SaveAutoevaluationActionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  responsible?: string;

  @IsOptional()
  @IsString()
  targetDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class SaveAutoevaluationDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  strengths?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  opportunities?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  conclusions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAutoevaluationScoreDto)
  scores?: SaveAutoevaluationScoreDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAutoevaluationActionDto)
  actions?: SaveAutoevaluationActionDto[];
}
