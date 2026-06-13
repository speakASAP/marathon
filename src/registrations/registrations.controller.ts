import { Body, Controller, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { RegistrationsService, RegistrationRequest, RegistrationResponse } from './registrations.service';
import { validatePortalToken, validateToken } from '../shared/auth-client';

@Controller('registrations')
export class RegistrationsController {
  private readonly logger = new Logger(RegistrationsController.name);

  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  async register(
    @Body() payload: RegistrationRequest,
    @Req() req?: Request,
  ): Promise<RegistrationResponse> {
    this.logger.log(
      `marathon.registration.requested hasEmail=${Boolean(payload.email)} hasPhone=${Boolean(payload.phone)} languageCode=${payload.languageCode || ''}`,
    );
    this.logger.debug(`Registration request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      payloadKeys: Object.keys(payload),
      hasEmail: Boolean(payload.email),
      hasPhone: Boolean(payload.phone),
      languageCode: payload.languageCode,
      ip: req?.ip,
    })}`);

    try {
      const userId = await this.getOptionalUserId(req);
      const result = await this.registrationsService.register(payload, userId);
      this.logger.log(
        `marathon.registration.created marathonerId=${result.marathonerId} hasRedirect=${!!result.redirectUrl} userBound=${result.userBound}`,
      );
      this.logger.debug(`Registration response: ${JSON.stringify({
        marathonerId: result.marathonerId,
        hasRedirectUrl: !!result.redirectUrl,
        userBound: result.userBound,
      })}`);
      return result;
    } catch (error) {
      this.logger.error(
        `marathon.registration.failed hasEmail=${Boolean(payload.email)} hasPhone=${Boolean(payload.phone)} languageCode=${payload.languageCode || ''} error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async getOptionalUserId(req?: Request): Promise<string | undefined> {
    const auth = req?.headers.authorization;
    if (!auth) {
      return undefined;
    }
    if (!auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid registration authorization header');
    }
    const token = auth.slice(7);
    const user = (await validateToken(token)) || validatePortalToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired registration token');
    }
    return user.id;
  }
}
