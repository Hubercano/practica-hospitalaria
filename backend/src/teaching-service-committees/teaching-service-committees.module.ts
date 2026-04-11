import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeachingServiceCommitteesController } from './teaching-service-committees.controller';
import { TeachingServiceCommitteesService } from './teaching-service-committees.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeachingServiceCommitteesController],
  providers: [TeachingServiceCommitteesService],
})
export class TeachingServiceCommitteesModule {}