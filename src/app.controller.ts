import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): { service: string; version: string; status: string; endpoints: { health: string; api: string } } {
    return this.appService.root();
  }

  @Get('health')
  getHealth(): { status: string } {
    return this.appService.health();
  }
}
