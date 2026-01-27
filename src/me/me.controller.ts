import { Controller, Get, Logger, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../shared/auth.guard';
import { MeService, MyMarathon } from './me.service';

type RequestWithUser = Request & { user?: { id: string } };

@Controller('me/marathons')
@UseGuards(AuthGuard)
export class MeController {
  private readonly logger = new Logger(MeController.name);

  constructor(private readonly meService: MeService) {}

  @Get()
  async list(@Req() req: RequestWithUser): Promise<MyMarathon[]> {
    const userId = req.user!.id;
    
    this.logger.log(`My marathons list request received: userId=${userId}`);
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req.method,
      path: req.path,
      query: req.query,
      userId,
      ip: req.ip,
    })}`);

    try {
      const result = await this.meService.listMarathons(userId);
      this.logger.log(`My marathons list response: userId=${userId}, count=${result.length}`);
      return result;
    } catch (error) {
      this.logger.error(
        `My marathons list failed: userId=${userId}, error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get(':marathonerId')
  async getById(
    @Req() req: RequestWithUser,
    @Param('marathonerId') marathonerId: string,
  ): Promise<MyMarathon> {
    const userId = req.user!.id;
    
    this.logger.log(`My marathon detail request received: userId=${userId}, marathonerId=${marathonerId}`);
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req.method,
      path: req.path,
      params: req.params,
      userId,
      marathonerId,
      ip: req.ip,
    })}`);

    try {
      const marathon = await this.meService.getMarathonById(userId, marathonerId);
      if (!marathon) {
        this.logger.warn(`My marathon not found: userId=${userId}, marathonerId=${marathonerId}`);
        throw new NotFoundException('Marathon not found');
      }
      this.logger.log(
        `My marathon detail response: userId=${userId}, marathonerId=${marathonerId}, title=${marathon.title}`,
      );
      return marathon;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `My marathon detail failed: userId=${userId}, marathonerId=${marathonerId}, error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
