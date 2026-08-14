import { Module } from '@nestjs/common';
import { AdminRiderController } from './admin-rider.controller';
import { AdminRiderService } from './admin-rider.service';

@Module({
  controllers: [AdminRiderController],
  providers: [AdminRiderService],
})
export class AdminRiderModule {}
