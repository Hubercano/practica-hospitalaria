import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateInstitutionDto {
  @IsString()
  @IsOptional()
  typeId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  nit?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
