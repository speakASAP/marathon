import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { validateToken, validatePortalToken } from './auth-client';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }
    const token = auth.slice(7);
    let user = await validateToken(token);
    if (!user) {
      user = validatePortalToken(token);
    }
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    (request as Request & { user?: { id: string } }).user = user;
    return true;
  }
}
