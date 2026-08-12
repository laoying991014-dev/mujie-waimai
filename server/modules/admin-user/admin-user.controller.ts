import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { Roles } from '@server/modules/auth/roles.decorator';
import { AdminUserService } from './admin-user.service';
import type { AdminUser, PaginatedResponse } from '@shared/api.interface';

@Controller('api/admin/users')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'super')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('keyword') keyword = '',
    @Query('status') status: 'all' | 'active' | 'disabled' = 'all',
  ): Promise<PaginatedResponse<AdminUser>> {
    const validStatuses: Array<'all' | 'active' | 'disabled'> = ['all', 'active', 'disabled'];
    const safeStatus = validStatuses.includes(status) ? status : 'all';
    return this.adminUserService.list(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      keyword,
      safeStatus,
    );
  }

  @Post()
  async create(
    @Body() dto: { phone: string; password: string; nickname: string; avatarUrl?: string },
  ): Promise<{ id: string }> {
    return this.adminUserService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: { nickname?: string; phone?: string; avatarUrl?: string },
  ): Promise<{ success: true }> {
    return this.adminUserService.update(id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: 'active' | 'disabled' },
  ): Promise<{ success: true; status: string }> {
    return this.adminUserService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.adminUserService.remove(id);
  }
}
