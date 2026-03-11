import { Module } from '@nestjs/common';
import { RiskAssessmentsService } from './risk-assessments.service';
import {
  RiskAssessmentsController,
  RiskAssessmentsOverdueController,
} from './risk-assessments.controller';

@Module({
  providers: [RiskAssessmentsService],
  controllers: [RiskAssessmentsController, RiskAssessmentsOverdueController],
  exports: [RiskAssessmentsService],
})
export class RiskAssessmentsModule {}
