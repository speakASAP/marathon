import { Body, Controller, Get, HttpException, Logger, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import {
  RegistrationsService,
  RegistrationAvailabilityRequest,
  RegistrationAvailabilityResponse,
  RegistrationRequest,
  RegistrationResponse,
} from './registrations.service';
import { validatePortalToken, validateToken, type AuthUser } from '../shared/auth-client';

@Controller('registrations')
export class RegistrationsController {
  private readonly logger = new Logger(RegistrationsController.name);

  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get('availability')
  async availability(
    @Query('email') email?: string,
    @Query('phone') phone?: string,
    @Query('languageCode') languageCode?: string,
  ): Promise<RegistrationAvailabilityResponse> {
    const payload: RegistrationAvailabilityRequest = { email, phone, languageCode };
    this.logger.log(
      `marathon.registration.availability_requested hasEmail=${Boolean(email)} hasPhone=${Boolean(phone)} languageCode=${languageCode || ''}`,
    );
    return this.registrationsService.checkAvailability(payload);
  }

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
      const authUser = await this.getOptionalUser(req);
      const result = await this.registrationsService.register(payload, authUser);
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
      const status = error instanceof HttpException ? error.getStatus() : 500;
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'marathon.registration.failed hasEmail=' + Boolean(payload.email) + ' hasPhone=' + Boolean(payload.phone) + ' languageCode=' + (payload.languageCode || '') + ' status=' + status + ' reason=' + reason.replace(/\s+/g, '_'),
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async getOptionalUser(req?: Request): Promise<AuthUser | undefined> {
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
    return user;
  }
}
