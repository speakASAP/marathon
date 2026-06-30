import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { AppModule } from './app.module';
import { MarathonLogger } from './shared/marathon-logger';
import { validateEnv } from './shared/validate-env';
import { WinnersService } from './winners/winners.service';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  try {
    console.log('Starting Marathon bootstrap...');
    validateEnv();
    console.log('Environment validated');
    console.log('Creating NestJS app...');
    const app = await NestFactory.create(AppModule, {
      logger: new MarathonLogger(),
    });
    console.log('App created');
    app.enableShutdownHooks();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'info'] });
    const expressApp = app.getHttpAdapter().getInstance();
    const indexPath = join(__dirname, '..', 'public', 'index.html');
    const winnersService = app.get(WinnersService);
    const escapeHtml = (value: string): string => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const absoluteUrl = (value: string, baseUrl: string): string => {
      if (!value) return '';
      try {
        return new URL(value, baseUrl).href;
      } catch {
        return '';
      }
    };

    expressApp.get(/^\/winners(?:\/[^/]+)?\/?$/, async (req: any, res: any) => {
      const publicBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || `https://${process.env.DOMAIN || req.get('host')}`).replace(/\/+$/, '');
      const queryWinnerId = Array.isArray(req.query?.me) ? req.query.me[0] : req.query?.me;
      const pathWinnerId = req.path.startsWith('/winners/') ? decodeURIComponent(req.path.replace(/^\/winners\//, '').replace(/\/+$/, '')) : '';
      const winnerId = String(queryWinnerId || pathWinnerId || '').trim();

      if (!winnerId) {
        res.sendFile(indexPath);
        return;
      }

      try {
        const winner = await winnersService.getById(winnerId);
        if (!winner) {
          res.sendFile(indexPath);
          return;
        }

        const html = await readFile(indexPath, 'utf8');
        const pageUrl = `${publicBaseUrl}${req.originalUrl || req.url || `/winners?me=${encodeURIComponent(winnerId)}`}`;
        const imageUrl = absoluteUrl(winner.avatar, publicBaseUrl);
        const medals = [
          winner.gold > 0 ? `${winner.gold} золотых` : '',
          winner.silver > 0 ? `${winner.silver} серебряных` : '',
          winner.bronze > 0 ? `${winner.bronze} бронзовых` : '',
        ].filter(Boolean).join(', ');
        const title = `${winner.name || 'Финалист'} - финалист SpeakASAP`;
        const description = medals
          ? `${winner.name || 'Финалист'} среди финалистов языковых марафонов SpeakASAP: ${medals} медалей.`
          : `${winner.name || 'Финалист'} среди финалистов языковых марафонов SpeakASAP.`;
        const tags = [
          `<title>${escapeHtml(title)}</title>`,
          `<meta name="description" content="${escapeHtml(description)}" />`,
          `<meta property="og:type" content="profile" />`,
          `<meta property="og:title" content="${escapeHtml(title)}" />`,
          `<meta property="og:description" content="${escapeHtml(description)}" />`,
          `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
          imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : '',
          imageUrl ? `<meta name="twitter:card" content="summary_large_image" />` : `<meta name="twitter:card" content="summary" />`,
          `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
          `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
          imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : '',
        ].filter(Boolean).join('\n    ');

        res.type('html').send(html.replace(/<title>.*?<\/title>/, '').replace('</head>', `    ${tags}\n  </head>`));
      } catch (error) {
        Logger.warn(`Winner OG render failed: winnerId=${winnerId}, error=${error instanceof Error ? error.message : String(error)}`, 'Bootstrap');
        res.sendFile(indexPath);
      }
    });
    expressApp.get(/^\/(?!api\/v1(?:\/|$)|health$|info$|assets\/|catalog\/|static\/|img\/|favicon\.ico$).*/, (_req: any, res: any) => {
      res.sendFile(indexPath);
    });
    const port = Number(process.env.PORT);
    console.log(`Starting server on port ${port}...`);
    await app.listen(port);
    Logger.log(`Marathon started on port ${port}`, 'Bootstrap');
  } catch (error) {
    console.error('Bootstrap error:', error);
    console.error('Error stack:', (error as Error).stack);
    Logger.error('Marathon bootstrap failed', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Uncaught bootstrap error:', error);
  console.error('Error stack:', (error as Error).stack);
  Logger.error('Marathon bootstrap failed', error);
  process.exit(1);
});
