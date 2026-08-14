import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminRiderService } from './admin-rider.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/admin/riders')
@UseGuards(JwtAuthGuard)
export class AdminRiderController {
  constructor(private readonly adminRiderService: AdminRiderService) {}

  @Get()
  async list(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('keyword') keyword: string = '',
    @Query('status') status: string = 'all',
    @Query('auditStatus') auditStatus: string = 'all',
  ) {
    return this.adminRiderService.list(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      keyword,
      status as 'all' | 'active' | 'disabled',
      auditStatus as 'all' | 'pending' | 'approved' | 'rejected',
    );
  }

  @Get('stats')
  async getStats() {
    return this.adminRiderService.getStats();
  }

  @Post()
  async create(@Body() body: { account: string; password: string; name: string; phone: string; idCard?: string }) {
    return this.adminRiderService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; phone?: string; idCard?: string }) {
    return this.adminRiderService.update(id, body);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'disabled' }) {
    return this.adminRiderService.updateStatus(id, body.status);
  }

  @Put(':id/audit')
  async audit(@Param('id') id: string, @Body() body: { result: 'approved' | 'rejected'; reason?: string }) {
    return this.adminRiderService.audit(id, body.result, body.reason);
  }

  @Put(':id/password')
  async updatePassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.adminRiderService.updatePassword(id, body.password);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.adminRiderService.remove(id);
  }

  @Get(':id/orders')
  async getRiderOrders(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    return this.adminRiderService.getRiderOrders(id, parseInt(page, 10), parseInt(pageSize, 10));
  }
}
