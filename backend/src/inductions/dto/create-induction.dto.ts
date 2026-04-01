import { ArrayMinSize, IsArray, IsDateString, IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateInductionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  inductionDate: string;

  @IsIn(['THREE_MONTHS', 'SIX_MONTHS', 'ONE_YEAR', 'ONE_YEAR_SIX_MONTHS', 'TWO_YEARS'])
  validityCode: 'THREE_MONTHS' | 'SIX_MONTHS' | 'ONE_YEAR' | 'ONE_YEAR_SIX_MONTHS' | 'TWO_YEARS';

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];
}
