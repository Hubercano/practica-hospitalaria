import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PrismaModule } from '../prisma/prisma.module';
import { AutoevaluationsController } from './autoevaluations.controller';
import { AutoevaluationsService } from './autoevaluations.service';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/autoevaluations-evidences/',
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const ext = file.originalname.split('.').pop();
          cb(null, `${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`);
        },
      }),
    }),
  ],
  controllers: [AutoevaluationsController],
  providers: [AutoevaluationsService],
  exports: [AutoevaluationsService],
})
export class AutoevaluationsModule {}

