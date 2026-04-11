import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CounterpartRequestsService } from './counterpart-requests.service';
import { CreateCounterpartRequestDto } from './dto/create-counterpart-request.dto';
import { ApproveCounterpartRequestDto } from './dto/approve-counterpart-request.dto';

@Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
@Controller('counterpart-requests')
export class CounterpartRequestsController {
  constructor(private readonly counterpartRequestsService: CounterpartRequestsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('markAsSeen', new ParseBoolPipe({ optional: true })) markAsSeen?: boolean,
  ) {
    return this.counterpartRequestsService.findAll(user, markAsSeen ?? true);
  }

  @Get('notifications/summary')
  getNotificationSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.counterpartRequestsService.getNotificationSummary(user);
  }

  @Get(':id/file')
  async downloadFile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Res() res: Response) {
    const file = await this.counterpartRequestsService.downloadFile(user, id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.originalFileName}"`,
    });

    createReadStream(file.absolutePath).pipe(res);
  }

  @Post()
  @Roles(UserRole.HOSPITAL)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCounterpartRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo .xlsx.');
    }

    return this.counterpartRequestsService.create(user, dto, file);
  }

  @Post(':id/approve')
  @Roles(UserRole.INSTITUCION)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveCounterpartRequestDto,
  ) {
    return this.counterpartRequestsService.approve(user, id, dto);
  }

  @Post(':id/reject')
  @Roles(UserRole.INSTITUCION)
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.counterpartRequestsService.reject(user, id);
  }
}