import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCounterpartRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  name!: string;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsUUID()
  institutionId!: string;
}