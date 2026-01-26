import { Body, Controller, Post } from '@nestjs/common';
import { RegistrationsService, RegistrationRequest, RegistrationResponse } from './registrations.service';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  register(@Body() payload: RegistrationRequest): RegistrationResponse {
    return this.registrationsService.register(payload);
  }
}
