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
import { AdminMerchantService } from './admin-merchant.service';
import type { AdminMerchant, PaginatedResponse } from '@shared/api.interface';

@Controller('api/admin/merchants')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'super')
export class AdminMerchantController {
  constructor(private readonly adminMerchantService: AdminMerchantService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('keyword') keyword = '',
    @Query('auditStatus') auditStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'all',
  ): Promise<PaginatedResponse<AdminMerchant>> {
    const validStatuses: Array<'all' | 'pending' | 'approved' | 'rejected'> = [
      'all',
      'pending',
      'approved',
      'rejected',
    ];
    const safeStatus = validStatuses.includes(auditStatus) ? auditStatus : 'all';
    return this.adminMerchantService.list(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      keyword,
      safeStatus,
    );
  }

  @Post()
  async create(
    @Body()
    dto: {
      account: string;
      password: string;
      shopName: string;
      contactName: string;
      contactPhone: string;
      paymentRecipientName?: string;
      paymentPhone?: string;
      address: string;
      categoryId?: string;
      deliveryFee: string;
      minOrderAmount: string;
    },
  ): Promise<{ id: string }> {
    return this.adminMerchantService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      shopName?: string;
      contactName?: string;
      contactPhone?: string;
      paymentRecipientName?: string;
      paymentPhone?: string;
      address?: string;
      categoryId?: string;
      deliveryFee?: string;
      minOrderAmount?: string;
    },
  ): Promise<{ success: true }> {
    return this.adminMerchantService.update(id, dto);
  }

  @Post(':id/audit')
  async audit(
    @Param('id') id: string,
    @Body() dto: { result: 'approved' | 'rejected'; reason?: string },
  ): Promise<{ success: true; auditStatus: string }> {
    return this.adminMerchantService.audit(id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: 'active' | 'disabled' },
  ): Promise<{ success: true; status: string }> {
    return this.adminMerchantService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.adminMerchantService.remove(id);
  }

  @Patch(':id/password')
  async updatePassword(
    @Param('id') id: string,
    @Body() dto: { password: string },
  ): Promise<{ success: true }> {
    return this.adminMerchantService.updatePassword(id, dto.password);
  }
}
