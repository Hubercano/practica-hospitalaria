import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AssignSurveyToRotationDto {
  @IsString()
  @MinLength(1)
  rotationScheduleId!: string;

  @IsString()
  @MinLength(1)
  surveyId!: string;

  @IsOptional()
  @IsBoolean()
  sendAfterRotationEnd?: boolean;
}
