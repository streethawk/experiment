import { Module } from '@nestjs/common';
import { CareNotesService } from './care-notes.service';
import { CareNotesController } from './care-notes.controller';

@Module({
  providers: [CareNotesService],
  controllers: [CareNotesController],
  exports: [CareNotesService],
})
export class CareNotesModule {}
