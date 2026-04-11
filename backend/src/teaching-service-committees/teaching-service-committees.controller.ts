import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { TeachingServiceCommitteesService } from './teaching-service-committees.service';
import { UpsertTeachingServiceCommitteeDto } from './dto/upsert-teaching-service-committee.dto';

@Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
@Controller('teaching-service-committees')
export class TeachingServiceCommitteesController {
  constructor(private readonly service: TeachingServiceCommitteesService) {}

  @Get()
  getMatrix(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    return this.service.getMatrix(user, year);
  }

  @Put(':year/:institutionId/:committeeNumber')
  @Roles(UserRole.HOSPITAL)
  upsertCommittee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('year', ParseIntPipe) year: number,
    @Param('institutionId') institutionId: string,
    @Param('committeeNumber', ParseIntPipe) committeeNumber: number,
    @Body() dto: UpsertTeachingServiceCommitteeDto,
  ) {
    return this.service.upsertCommittee(user, year, institutionId, committeeNumber, dto);
  }

  @Post(':year/:institutionId/:committeeNumber/file')
  @Roles(UserRole.HOSPITAL)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('year', ParseIntPipe) year: number,
    @Param('institutionId') institutionId: string,
    @Param('committeeNumber', ParseIntPipe) committeeNumber: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.uploadFile(user, year, institutionId, committeeNumber, file);
  }
}