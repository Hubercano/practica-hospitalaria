import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsArray, IsUUID } from 'class-validator';

export class CreateRotationAreaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  durationWeeks?: number;

  @IsInt()
  @Min(0)
  maxStudents?: number;
  
  @IsString()
  @IsNotEmpty()
  programId: string; 
  
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds?: string[];
}
