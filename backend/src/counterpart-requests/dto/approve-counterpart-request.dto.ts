import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class ApproveCounterpartRequestDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valueWithoutDiscount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPercentage!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valueWithDiscount!: number;
}