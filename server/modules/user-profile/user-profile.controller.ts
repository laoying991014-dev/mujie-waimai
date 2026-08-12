import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import type { UserProfile } from '@shared/api.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserProfileService } from './user-profile.service';

@UseGuards(JwtAuthGuard)
@Roles('user')
@Controller('api/user/profile')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get()
  async getProfile(@Req() req: any): Promise<UserProfile> {
    return this.userProfileService.getProfile(req.user.id);
  }

  @Put()
  async updateProfile(
    @Req() req: any,
    @Body() body: { nickname?: string; avatarUrl?: string },
  ): Promise<UserProfile> {
    return this.userProfileService.updateProfile(req.user.id, body);
  }
}
