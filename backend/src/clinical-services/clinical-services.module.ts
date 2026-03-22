import { Module } from '@nestjs/common';
import { ClinicalServicesService } from './clinical-services.service';
import { ClinicalServicesController } from './clinical-services.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicalServicesController],
  providers: [ClinicalServicesService],
  exports: [ClinicalServicesService] // Exported so other modules can use it
})
export class ClinicalServicesModule {}
