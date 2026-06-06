import { Module } from '@nestjs/common';
import { PingService } from './ping.service';
import { SsrfGuardService } from './ssrf-guard.service';

@Module({
  providers: [PingService, SsrfGuardService],
  exports: [PingService, SsrfGuardService],
})
export class PingModule {}
