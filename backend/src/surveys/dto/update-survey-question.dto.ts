import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class UpdateSurveyQuestionOptionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  value!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class UpdateSurveyQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE', 'DROPDOWN'])
  type?: 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SCALE' | 'DROPDOWN';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  scaleMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  scaleMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  scaleStep?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSurveyQuestionOptionDto)
  options?: UpdateSurveyQuestionOptionDto[];
}
