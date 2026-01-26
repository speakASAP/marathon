import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarathonsService, MarathonSummary } from './marathons.service';

@Controller('marathons')
export class MarathonsController {
  constructor(private readonly marathonsService: MarathonsService) {}

  @Get()
  list(
    @Query('languageCode') languageCode?: string,
    @Query('active') active?: string,
  ): Promise<MarathonSummary[]> {
    const activeFlag = active === undefined ? undefined : active === 'true';
    return this.marathonsService.list(languageCode, activeFlag);
  }

  @Get('languages')
  listLanguages(): Promise<string[]> {
    return this.marathonsService.listLanguages();
  }

  @Get('by-language/:languageCode')
  getByLanguage(@Param('languageCode') languageCode: string): Promise<MarathonSummary | null> {
    return this.marathonsService.getByLanguage(languageCode);
  }

  @Get(':marathonId')
  getById(@Param('marathonId') marathonId: string): Promise<MarathonSummary | null> {
    return this.marathonsService.getById(marathonId);
  }
}
