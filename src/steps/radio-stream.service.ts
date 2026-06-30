import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { Response } from 'express';

const ALLOWED_RADIO_HOSTS = new Set([
  'bbcwssc.ic.llnwd.net',
  'bbcmedia.ic.llnwd.net',
  'centova.radios.pt',
  'direct.franceculture.fr',
  'dispatcher.rndfnk.com',
  'fm01-ice.stream.khz.se',
  'fm02-ice.stream.khz.se',
  'http-live.sr.se',
  'icecast.omroep.nl',
  'icecast2.play.cz',
  'icecast8.play.cz',
  'icestreaming.rai.it',
  'live-icy.gss.dr.dk',
  'live-bauerse-fm.sharp-stream.com',
  'live.alternativefm.de',
  'lyd.nrk.no',
  'radio5.rtveradio.cires21.com',
  's5.deb1.scdn.smcloud.net',
  'stream.34bit.net',
  'stream.lokalradio.nrw',
  'stream4.nadaje.com',
  'transamerica.crossradio.com.br',
  'wr13-ice.stream.khz.se',
]);

function parseAllowedRadioUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException('Invalid radio stream URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Unsupported radio stream protocol');
  }

  if (!ALLOWED_RADIO_HOSTS.has(url.hostname.toLowerCase())) {
    throw new BadRequestException('Radio stream host is not allowed');
  }

  return url;
}

@Injectable()
export class RadioStreamService {
  private readonly logger = new Logger(RadioStreamService.name);

  async proxy(rawUrl: string, res: Response): Promise<void> {
    const url = parseAllowedRadioUrl(rawUrl || '');
    let upstream: globalThis.Response;

    try {
      upstream = await fetch(url.href, {
        headers: {
          'Icy-MetaData': '1',
          'User-Agent': 'SpeakASAP Marathon Radio Proxy/1.0',
        },
        redirect: 'follow',
      });
    } catch (error) {
      this.logger.warn(`Radio stream fetch failed: host=${url.hostname} message=${error instanceof Error ? error.message : 'unknown'}`);
      res.status(502).send('Radio stream is unavailable');
      return;
    }

    if (!upstream.ok || !upstream.body) {
      this.logger.warn(`Radio stream rejected: host=${url.hostname} status=${upstream.status}`);
      res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).send('Radio stream is unavailable');
      return;
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    for (const header of ['icy-name', 'icy-description', 'icy-genre', 'icy-url', 'icy-br', 'icy-metaint']) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }

    Readable.fromWeb(upstream.body as any).on('error', (error) => {
      this.logger.warn(`Radio stream pipe failed: host=${url.hostname} message=${error instanceof Error ? error.message : 'unknown'}`);
      if (!res.destroyed) res.end();
    }).pipe(res);
  }
}
