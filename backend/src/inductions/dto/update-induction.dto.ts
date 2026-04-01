import { PartialType } from '@nestjs/mapped-types';
import { CreateInductionDto } from './create-induction.dto';

export class UpdateInductionDto extends PartialType(CreateInductionDto) {}
