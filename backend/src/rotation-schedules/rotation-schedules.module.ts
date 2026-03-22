import { Module } from '@nestjs/common';
import { RotationSchedulesService } from './rotation-schedules.service';
import { RotationSchedulesController } from './rotation-schedules.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RotationSchedulesController],
  providers: [RotationSchedulesService]
})
export class RotationSchedulesModule {}
