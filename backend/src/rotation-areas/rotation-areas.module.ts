import { Module } from '@nestjs/common';
import { RotationAreasService } from './rotation-areas.service';
import { RotationAreasController } from './rotation-areas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RotationAreasController],
  providers: [RotationAreasService],
})
export class RotationAreasModule {}
