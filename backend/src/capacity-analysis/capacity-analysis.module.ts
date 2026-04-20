import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CapacityAnalysisController } from './capacity-analysis.controller';
import { CapacityAnalysisService } from './capacity-analysis.service';

@Module({
  imports: [PrismaModule],
  controllers: [CapacityAnalysisController],
  providers: [CapacityAnalysisService],
})
export class CapacityAnalysisModule {}
