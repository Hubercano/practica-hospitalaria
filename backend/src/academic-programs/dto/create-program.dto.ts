import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAcademicProgramDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  level: string;

  @IsString()
  @IsNotEmpty() // Making it required based on "El usuario solo puede seleccionar una institución"
  institutionId: string;

  @IsString()
  @IsOptional()
  technicalAnnex?: string; // We'll receive a URL or path
}
