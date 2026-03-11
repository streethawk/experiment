import { Module } from '@nestjs/common';
import { HomesService } from './homes.service';
import { HomesController } from './homes.controller';

@Module({
  providers: [HomesService],
  controllers: [HomesController],
  exports: [HomesService],
})
export class HomesModule {}
