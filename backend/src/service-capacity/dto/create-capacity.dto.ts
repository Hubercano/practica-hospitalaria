import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateServiceCapacityDto {
  @IsString()
  @IsNotEmpty()
  headquarters: string;

  @IsString()
  @IsNotEmpty()
  headquartersName: string;

  @IsString()
  @IsOptional()
  capacityGroup?: string;

  @IsString()
  @IsOptional()
  concept?: string;

  @IsNumber()
  @IsNotEmpty()
  capacityQuantity: number;

  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds: string[];

  // Optional Distinctive Code just in case
  @IsString()
  @IsOptional()
  distinctiveCode?: string;
}
