import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AddressItem } from '@shared/api.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AddressService } from './address.service';

@UseGuards(JwtAuthGuard)
@Roles('user')
@Controller('api/addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  async getAddresses(@Req() req: any): Promise<{ items: AddressItem[] }> {
    return this.addressService.getAddresses(req.user.id);
  }

  @Post()
  async createAddress(
    @Req() req: any,
    @Body()
    body: {
      receiverName: string;
      receiverPhone: string;
      province: string;
      city: string;
      district: string;
      detailAddress: string;
      isDefault?: boolean;
    },
  ): Promise<AddressItem> {
    return this.addressService.createAddress(req.user.id, body);
  }

  @Put(':id')
  async updateAddress(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      receiverName?: string;
      receiverPhone?: string;
      province?: string;
      city?: string;
      district?: string;
      detailAddress?: string;
      isDefault?: boolean;
    },
  ): Promise<AddressItem> {
    return this.addressService.updateAddress(req.user.id, id, body);
  }

  @Delete(':id')
  async deleteAddress(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.addressService.deleteAddress(req.user.id, id);
  }

  @Post(':id/default')
  async setDefault(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.addressService.setDefault(req.user.id, id);
  }
}
