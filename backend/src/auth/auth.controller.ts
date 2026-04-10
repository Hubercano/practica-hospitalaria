import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { AuthService } from './auth.service';
import { AUTH_DEFAULT_REFRESH_TTL_MS, AUTH_REFRESH_COOKIE } from './auth.constants';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto, request.ip, request.headers['user-agent']);
    this.setRefreshCookie(response, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.refresh(request.cookies?.[AUTH_REFRESH_COOKIE], request.ip, request.headers['user-agent']);
    this.setRefreshCookie(response, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(request.cookies?.[AUTH_REFRESH_COOKIE]);
    this.clearRefreshCookie(response);
    return { success: true };
  }

  @Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user);
  }

  @Roles(UserRole.HOSPITAL, UserRole.INSTITUCION)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(user, dto);
    this.clearRefreshCookie(response);
    return result;
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie(AUTH_REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Number(process.env.AUTH_REFRESH_TOKEN_TTL_MS || AUTH_DEFAULT_REFRESH_TTL_MS),
      path: '/auth',
    });
  }

  private clearRefreshCookie(response: Response) {
    response.clearCookie(AUTH_REFRESH_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    });
  }
}