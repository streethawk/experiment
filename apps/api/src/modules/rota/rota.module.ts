import { Module } from '@nestjs/common';
import { RotaService } from './rota.service';
import { RotaController } from './rota.controller';

@Module({
  providers: [RotaService],
  controllers: [RotaController],
  exports: [RotaService],
})
export class RotaModule {}
