import { PartialType } from '@nestjs/mapped-types';
import { CreateRotationScheduleDto } from './create-rotation-schedule.dto';

export class UpdateRotationScheduleDto extends PartialType(CreateRotationScheduleDto) {}
