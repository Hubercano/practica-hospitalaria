import { IsNotEmpty, IsString } from 'class-validator';

export class PublicDocumentDto {
  @IsString()
  @IsNotEmpty()
  document: string;
}
