import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Service info for API clients; browser GET / serves frontend (static). */
  @Get('info')
  getInfo(): { service: string; version: string; status: string; endpoints: { health: string; api: string } } {
    return this.appService.root();
  }

  @Get('health')
  getHealth(): { status: string } {
    return this.appService.health();
  }
}
