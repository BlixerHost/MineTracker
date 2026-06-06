import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ServersService } from './servers.service';
import { ListServersDto } from './dto/list-servers.dto';
import { StatsQueryDto } from './dto/stats-query.dto';

@Controller('servers')
@UseGuards(ThrottlerGuard)
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Get()
  findAll(@Query() query: ListServersDto) {
    return this.serversService.findAll(query);
  }

  @Get('global-stats')
  getGlobalStats() {
    return this.serversService.getGlobalStats();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.serversService.findBySlug(slug);
  }

  @Get(':slug/stats')
  getStats(@Param('slug') slug: string, @Query() query: StatsQueryDto) {
    return this.serversService.getStats(slug, query.range);
  }
}
