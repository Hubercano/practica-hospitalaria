import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';
import { SurveysPublicController } from './surveys-public.controller';
import { SurveysDispatchScheduler } from './surveys-dispatch.scheduler';

@Module({
  imports: [PrismaModule],
  controllers: [SurveysController, SurveysPublicController],
  providers: [SurveysService, SurveysDispatchScheduler],
  exports: [SurveysService],
})
export class SurveysModule {}
