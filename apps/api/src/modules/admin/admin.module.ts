import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SubmissionsModule } from '../submissions/submissions.module';
import { WorkerModule } from '../worker/worker.module';

@Module({
  imports: [SubmissionsModule, WorkerModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
