import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { ServersModule } from '../servers/servers.module';
import { WorkerModule } from '../worker/worker.module';

@Module({
  imports: [ServersModule, WorkerModule],
  providers: [AggregationService],
})
export class StatsModule {}
