import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class SubmitDocumentValueDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsISO8601()
  expiryDate?: string;
}