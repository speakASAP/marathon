import { Controller, Get, Logger, NotFoundException, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  WinnersService,
  WinnerDetail,
  WinnersPaginated,
} from './winners.service';

@Controller('winners')
export class WinnersController {
  private readonly logger = new Logger(WinnersController.name);

  constructor(private readonly winnersService: WinnersService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ): Promise<WinnersPaginated> {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 24;
    
    this.logger.log(
      `Winners list request received: page=${pageNum}, limit=${limitNum}`,
    );
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      query: req?.query,
      ip: req?.ip,
    })}`);

    try {
      const result = await this.winnersService.list(pageNum, limitNum);
      this.logger.log(
        `Winners list response: total=${result.total}, items=${result.items.length}, page=${result.page}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Winners list failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get(':winnerId')
  async getById(
    @Param('winnerId') winnerId: string,
    @Req() req?: Request,
  ): Promise<WinnerDetail> {
    this.logger.log(`Winner detail request received: winnerId=${winnerId}`);
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      params: req?.params,
      ip: req?.ip,
    })}`);

    try {
      const winner = await this.winnersService.getById(winnerId);
      if (!winner) {
        this.logger.warn(`Winner not found: winnerId=${winnerId}`);
        throw new NotFoundException('Winner not found');
      }
      this.logger.log(
        `Winner detail response: winnerId=${winner.id}, name=${winner.name}, reviews=${winner.reviews.length}`,
      );
      return winner;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Winner detail failed: winnerId=${winnerId}, error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
