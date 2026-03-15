import { Module } from '@nestjs/common';
import { WoundsService } from './wounds.service';
import { WoundsController, WoundsOverviewController } from './wounds.controller';

@Module({
  providers: [WoundsService],
  controllers: [WoundsController, WoundsOverviewController],
  exports: [WoundsService],
})
export class WoundsModule {}
