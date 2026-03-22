import { IsString, IsEmail, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInstitutionDto {
  @IsString()
  @IsNotEmpty()
  typeId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  nit: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  address?: string;

  // Los documentos pueden no enviarse al momento de crear, o sí.
  // Pero lo ideal es que primero se cree la institución y luego se suban los documentos.
  // Sin embargo, para simplificar el flujo inicial, permitiremos crear sin docs y luego updatearlos.
}