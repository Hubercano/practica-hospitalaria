import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

class SubmitSurveyAnswerDto {
  @IsString()
  @MinLength(1)
  questionId!: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  answerNumber?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  answerOptions?: string[];
}

export class SubmitSurveyResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitSurveyAnswerDto)
  answers!: SubmitSurveyAnswerDto[];
}
