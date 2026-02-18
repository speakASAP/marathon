import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  root(): { service: string; version: string; status: string; endpoints: { health: string; api: string } } {
    return {
      service: 'marathon',
      version: '1.0',
      status: 'ok',
      endpoints: {
        health: '/health',
        api: '/api/v1',
      },
    };
  }

  health(): { status: string } {
    return { status: 'ok' };
  }
}
