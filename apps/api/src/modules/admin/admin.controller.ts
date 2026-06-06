import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Query, UseGuards, ParseIntPipe, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { SchedulerService } from '../worker/scheduler.service';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { UpdateServerDto } from './dto/update-server.dto';

interface AuthRequest extends FastifyRequest {
  user: { id: number; email: string };
}

function getIp(req: FastifyRequest): string {
  return (
    ((req.headers['x-forwarded-for'] as string) ?? '').split(',')[0]?.trim() ||
    req.ip ||
    '0.0.0.0'
  );
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly schedulerService: SchedulerService,
  ) {}

  // ─── Submissions ──────────────────────────────────────────────────────────

  @Get('submissions')
  listSubmissions(
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.adminService.listSubmissions(status, page, limit);
  }

  @Post('submissions/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewSubmissionDto,
    @Req() req: AuthRequest,
  ) {
    return this.adminService.approveSubmission(id, dto, req.user.id, getIp(req));
  }

  @Post('submissions/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewSubmissionDto,
    @Req() req: AuthRequest,
  ) {
    return this.adminService.rejectSubmission(id, dto, req.user.id, getIp(req));
  }

  @Delete('submissions/:id')
  @HttpCode(HttpStatus.OK)
  deleteSubmission(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.adminService.deleteSubmission(id, req.user.id, getIp(req));
  }

  // ─── Servers ──────────────────────────────────────────────────────────────

  @Get('servers')
  listServers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.adminService.listServers(page, limit);
  }

  @Patch('servers/:id')
  updateServer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServerDto,
    @Req() req: AuthRequest,
  ) {
    return this.adminService.updateServer(id, dto, req.user.id, getIp(req));
  }

  @Delete('servers/:id')
  @HttpCode(HttpStatus.OK)
  deleteServer(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.adminService.deleteServer(id, req.user.id, getIp(req));
  }

  @Post('servers/:id/recheck')
  @HttpCode(HttpStatus.OK)
  async recheckServer(@Param('id', ParseIntPipe) id: number) {
    await this.schedulerService.recheckServer(id);
    return { message: 'Recheck queued' };
  }

  // ─── Audit + Stats ────────────────────────────────────────────────────────

  @Get('audit-logs')
  getAuditLogs(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.adminService.getAuditLogs(page, limit);
  }

  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
}
