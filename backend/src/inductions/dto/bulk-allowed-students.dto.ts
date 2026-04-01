import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class BulkAllowedStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  documents: string[];
}
