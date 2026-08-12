import { Module } from '@nestjs/common';
import { MerchantShopController } from './merchant-shop.controller';
import { MerchantShopService } from './merchant-shop.service';

@Module({
  controllers: [MerchantShopController],
  providers: [MerchantShopService],
})
export class MerchantShopModule {}
