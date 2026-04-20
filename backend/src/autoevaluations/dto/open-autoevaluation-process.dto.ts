import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class OpenAutoevaluationProcessDto {
  @IsUUID()
  institutionId!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(4)
  period!: number;

  @IsOptional()
  @IsUUID()
  teachingServiceCommitteeId?: string;
}
