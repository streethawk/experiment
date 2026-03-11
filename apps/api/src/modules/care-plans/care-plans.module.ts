import { Module } from '@nestjs/common';
import { CarePlansService } from './care-plans.service';
import { CarePlansController } from './care-plans.controller';

@Module({
  providers: [CarePlansService],
  controllers: [CarePlansController],
  exports: [CarePlansService],
})
export class CarePlansModule {}
