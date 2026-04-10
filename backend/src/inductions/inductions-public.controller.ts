import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { InductionsService } from './inductions.service';
import { PublicDocumentDto } from './dto/public-document.dto';

@Public()
@Controller('public/inductions')
export class InductionsPublicController {
  constructor(private readonly inductionsService: InductionsService) {}

  @Get('access/:token')
  getAccessMetadata(@Param('token') token: string) {
    return this.inductionsService.publicMetadata(token);
  }

  @Post('access/:token/verify-document')
  verifyDocument(@Param('token') token: string, @Body() dto: PublicDocumentDto) {
    return this.inductionsService.publicVerifyDocument(token, dto.document);
  }

  @Post('access/:token/attend')
  attend(@Param('token') token: string, @Body() dto: PublicDocumentDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;
    return this.inductionsService.publicAttend(token, dto.document, ipAddress || undefined, userAgent || undefined);
  }
}
