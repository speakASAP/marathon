import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../shared/auth.guard';
import { MeService, MyMarathon } from './me.service';

type RequestWithUser = Request & { user?: { id: string } };

@Controller('me/marathons')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  async list(@Req() req: RequestWithUser): Promise<MyMarathon[]> {
    return this.meService.listMarathons(req.user!.id);
  }

  @Get(':marathonerId')
  async getById(
    @Req() req: RequestWithUser,
    @Param('marathonerId') marathonerId: string,
  ): Promise<MyMarathon> {
    const marathon = await this.meService.getMarathonById(req.user!.id, marathonerId);
    if (!marathon) {
      throw new NotFoundException('Marathon not found');
    }
    return marathon;
  }
}
