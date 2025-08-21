import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() body: { mfaToken?: string }) {
    return this.authService.login(req.user, body.mfaToken);
  }

  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }

  @Get('mfa/setup')
  async setupMFA(@Request() req) {
    return this.authService.setupMFA(req.user.id);
  }

  @Post('mfa/enable')
  async enableMFA(@Request() req, @Body() body: { token: string }) {
    return this.authService.enableMFA(req.user.id, body.token);
  }

  @Post('mfa/verify')
  async verifyMFA(@Request() req, @Body() body: { token: string }) {
    const isValid = await this.authService.verifyMFA(req.user.id, body.token);
    return { valid: isValid };
  }
}