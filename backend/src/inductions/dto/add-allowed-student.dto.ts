import { IsNotEmpty, IsString } from 'class-validator';

export class AddAllowedStudentDto {
  @IsString()
  @IsNotEmpty()
  document: string;
}
