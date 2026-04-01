import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAccessLinkDto {
  @IsOptional()
  @IsIn(['PERMANENT', 'TEMPORARY'])
  mode?: 'PERMANENT' | 'TEMPORARY';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
