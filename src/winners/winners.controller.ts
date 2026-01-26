import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import {
  WinnersService,
  WinnerDetail,
  WinnersPaginated,
} from './winners.service';

@Controller('winners')
export class WinnersController {
  constructor(private readonly winnersService: WinnersService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<WinnersPaginated> {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 24;
    return this.winnersService.list(pageNum, limitNum);
  }

  @Get(':winnerId')
  async getById(
    @Param('winnerId') winnerId: string,
  ): Promise<WinnerDetail> {
    const winner = await this.winnersService.getById(winnerId);
    if (!winner) {
      throw new NotFoundException('Winner not found');
    }
    return winner;
  }
}
