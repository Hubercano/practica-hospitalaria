import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class RotationShiftBoardAssignmentDto {
  @IsDateString()
  assignmentDate: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  shiftDefinitionId: string;
}

export class UpdateRotationShiftBoardDto {
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => RotationShiftBoardAssignmentDto)
  assignments?: RotationShiftBoardAssignmentDto[];
}