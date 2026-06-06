import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { SubmissionsService } from './submissions.service';
import { SubmitServerDto } from './dto/submit-server.dto';

@Controller('servers')
@UseGuards(ThrottlerGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: SubmitServerDto, @Req() req: FastifyRequest) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      '0.0.0.0';

    return this.submissionsService.submit(dto, ip);
  }
}
