import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('user/register')
  async registerUser(
    @Body() body: { phone: string; password: string; nickname?: string },
  ) {
    return this.authService.registerUser(body.phone, body.password, body.nickname);
  }

  @Post('user/login')
  async loginUser(@Body() body: { phone: string; password: string }) {
    return this.authService.loginUser(body.phone, body.password);
  }

  @Post('merchant/login')
  async loginMerchant(@Body() body: { account: string; password: string }) {
    return this.authService.loginMerchant(body.account, body.password);
  }

  @Post('admin/login')
  async loginAdmin(@Body() body: { username: string; password: string }) {
    return this.authService.loginAdmin(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return {
      type: req.user.role,
      profile: { id: req.user.id },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    return { success: true };
  }
}
