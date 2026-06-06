import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonitorProcessor } from './monitor.processor';
import { SchedulerService } from './scheduler.service';
import { SnapshotService } from './snapshot.service';
import { ServersModule } from '../servers/servers.module';
import { PingModule } from '../ping/ping.module';

@Module({
  imports: [ServersModule, PingModule],
  providers: [MonitorProcessor, SchedulerService, SnapshotService],
  exports: [SchedulerService, SnapshotService],
})
export class WorkerModule {}
