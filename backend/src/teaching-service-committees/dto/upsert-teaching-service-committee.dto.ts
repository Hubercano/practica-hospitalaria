import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertTeachingServiceCommitteeDto {
  @IsOptional()
  @IsDateString()
  date?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  time?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  extraField?: string | null;
}