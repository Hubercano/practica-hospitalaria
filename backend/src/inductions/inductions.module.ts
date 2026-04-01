import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InductionsService } from './inductions.service';
import { InductionsController } from './inductions.controller';
import { InductionsPublicController } from './inductions-public.controller';

@Module({
  imports: [PrismaModule],
  providers: [InductionsService],
  controllers: [InductionsController, InductionsPublicController],
})
export class InductionsModule {}
