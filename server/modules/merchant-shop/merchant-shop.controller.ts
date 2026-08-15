import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MerchantShopService } from './merchant-shop.service';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/jwt-auth.guard';

interface SaveSettingsBody {
  shopName: string;
  shopLogoUrl: string;
  shopCoverUrl: string;
  shopDescription: string;
  businessStartTime: string;
  businessEndTime: string;
  deliveryFee: string;
  minOrderAmount: string;
  paymentName: string;
  paymentPhone: string;
}

interface UpdateStatusBody {
  status: 'open' | 'closed';
}

@Controller('api/merchant/shop')
@UseGuards(JwtAuthGuard)
export class MerchantShopController {
  constructor(private readonly merchantShopService: MerchantShopService) {}

  @Get('settings')
  async getSettings(@Req() req: Request & { user: JwtPayload }) {
    return this.merchantShopService.getSettings(req.user.id);
  }

  @Put('settings')
  async saveSettings(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: SaveSettingsBody,
  ) {
    return this.merchantShopService.saveSettings(req.user.id, body);
  }

  @Patch('business-status')
  async updateBusinessStatus(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: UpdateStatusBody,
  ) {
    return this.merchantShopService.updateBusinessStatus(
      req.user.id,
      body.status,
    );
  }
}
