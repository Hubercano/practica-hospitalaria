import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, MinLength, ValidateNested } from 'class-validator';

class ReorderSurveyQuestionItemDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex!: number;
}

export class ReorderSurveyQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderSurveyQuestionItemDto)
  questions!: ReorderSurveyQuestionItemDto[];
}
