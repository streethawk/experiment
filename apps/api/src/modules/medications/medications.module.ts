import { Module } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import {
  MedicationsController,
  MarController,
  CdRegisterController,
} from './medications.controller';

@Module({
  providers: [MedicationsService],
  controllers: [MedicationsController, MarController, CdRegisterController],
  exports: [MedicationsService],
})
export class MedicationsModule {}
