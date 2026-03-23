import { IsArray, IsDateString, IsNotEmpty, IsOptional, ArrayMaxSize } from 'class-validator';

export class CreateRotationScheduleDto {
  @IsNotEmpty()
  institutionId: string;

  @IsNotEmpty()
  programId: string;

  @IsNotEmpty()
  areaId: string;

  @IsArray()
  @IsOptional()
  teacherIds?: string[];

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(100)
  studentIds?: string[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
