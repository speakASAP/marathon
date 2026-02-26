import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
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

  /**
   * SPA fallback: serve index.html for client-side routes (e.g. /winners, /de/) so
   * links from speakasap.com/marathon and direct URLs work instead of 404.
   */
  @Get('*')
  @Header('Content-Type', 'text/html')
  serveSpa(): StreamableFile {
    const path = join(__dirname, '..', 'public', 'index.html');
    return new StreamableFile(createReadStream(path));
  }
}
