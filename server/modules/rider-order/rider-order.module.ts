import { Module } from '@nestjs/common';
import { RiderOrderController, RiderController } from './rider-order.controller';
import { RiderOrderService } from './rider-order.service';

@Module({
  controllers: [RiderOrderController, RiderController],
  providers: [RiderOrderService],
})
export class RiderOrderModule {}
