import { Module } from '@nestjs/common';
import { StudentTypesService } from './student-types.service';
import { StudentTypesController } from './student-types.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StudentTypesService],
  controllers: [StudentTypesController]
})
export class StudentTypesModule {}
