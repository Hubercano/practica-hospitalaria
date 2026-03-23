import { Module } from '@nestjs/common';
import { AcademicProgramsService } from './academic-programs.service';
import { AcademicProgramsController } from './academic-programs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicProgramsController],
  providers: [AcademicProgramsService],
})
export class AcademicProgramsModule {}
