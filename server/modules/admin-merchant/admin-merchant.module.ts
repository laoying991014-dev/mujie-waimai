import { Module } from '@nestjs/common';
import { AdminMerchantController } from './admin-merchant.controller';
import { AdminMerchantService } from './admin-merchant.service';

@Module({
  controllers: [AdminMerchantController],
  providers: [AdminMerchantService],
})
export class AdminMerchantModule {}
