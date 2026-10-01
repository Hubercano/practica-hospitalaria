import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RotationScheduleMode, RotationShiftType } from '@prisma/client';

export class RotationFixedBlockDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsEnum(RotationShiftType)
  shiftType?: RotationShiftType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RotationShiftDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;
}

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

  @IsOptional()
  @IsEnum(RotationScheduleMode)
  scheduleMode?: RotationScheduleMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  shiftBoardPublishDaysBefore?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RotationFixedBlockDto)
  fixedBlocks?: RotationFixedBlockDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RotationShiftDefinitionDto)
  shiftDefinitions?: RotationShiftDefinitionDto[];
}
