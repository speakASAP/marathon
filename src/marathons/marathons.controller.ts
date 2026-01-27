import { Controller, Get, Logger, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { MarathonsService, MarathonSummary, MarathonLanguage } from './marathons.service';

@Controller('marathons')
export class MarathonsController {
  private readonly logger = new Logger(MarathonsController.name);

  constructor(private readonly marathonsService: MarathonsService) {}

  @Get()
  async list(
    @Query('languageCode') languageCode?: string,
    @Query('active') active?: string,
    @Req() req?: Request,
  ): Promise<MarathonSummary[]> {
    const activeFlag = active === undefined ? undefined : active === 'true';
    
    this.logger.log(`Marathons list request received: languageCode=${languageCode || 'all'}, active=${activeFlag}`);
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      query: req?.query,
      ip: req?.ip,
    })}`);

    try {
      const result = await this.marathonsService.list(languageCode, activeFlag);
      this.logger.log(`Marathons list response: count=${result.length}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Marathons list failed: error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('languages')
  async listLanguages(@Req() req?: Request): Promise<MarathonLanguage[]> {
    this.logger.log('Marathon languages request received');
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      ip: req?.ip,
    })}`);

    try {
      const result = await this.marathonsService.listLanguages();
      this.logger.log(`Marathon languages response: count=${result.length}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Marathon languages failed: error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('by-language/:languageCode')
  async getByLanguage(
    @Param('languageCode') languageCode: string,
    @Req() req?: Request,
  ): Promise<MarathonSummary | null> {
    this.logger.log(`Marathon by language request received: languageCode=${languageCode}`);
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      params: req?.params,
      ip: req?.ip,
    })}`);

    try {
      const result = await this.marathonsService.getByLanguage(languageCode);
      this.logger.log(`Marathon by language response: found=${!!result}, languageCode=${languageCode}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Marathon by language failed: languageCode=${languageCode}, error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get(':marathonId')
  async getById(
    @Param('marathonId') marathonId: string,
    @Req() req?: Request,
  ): Promise<MarathonSummary | null> {
    this.logger.log(`Marathon detail request received: marathonId=${marathonId}`);
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      params: req?.params,
      ip: req?.ip,
    })}`);

    try {
      const result = await this.marathonsService.getById(marathonId);
      this.logger.log(`Marathon detail response: found=${!!result}, marathonId=${marathonId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Marathon detail failed: marathonId=${marathonId}, error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
