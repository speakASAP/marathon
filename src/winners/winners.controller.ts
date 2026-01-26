import { Controller, Get, Param } from '@nestjs/common';
import { WinnersService, WinnerSummary } from './winners.service';

@Controller('winners')
export class WinnersController {
  constructor(private readonly winnersService: WinnersService) {}

  @Get()
  list(): Promise<WinnerSummary[]> {
    return this.winnersService.list();
  }

  @Get(':winnerId')
  getById(@Param('winnerId') winnerId: string): Promise<WinnerSummary | null> {
    return this.winnersService.getById(winnerId);
  }
}
