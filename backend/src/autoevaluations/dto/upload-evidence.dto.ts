import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UploadEvidenceDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  // file object is handled by Multer middleware, not by DTO
}
