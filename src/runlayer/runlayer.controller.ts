import { Body, Controller, Logger, Post } from '@nestjs/common';
import { RunlayerService, RunlayerTaskRequest, RunlayerTaskResponse } from './runlayer.service';

@Controller('tasks')
export class RunlayerController {
  private readonly logger = new Logger(RunlayerController.name);

  constructor(private readonly runlayerService: RunlayerService) {}

  @Post('execute')
  async execute(@Body() body: RunlayerTaskRequest): Promise<RunlayerTaskResponse> {
    this.logger.log(`RunLayer task request received: taskId=${body?.task_id || 'unknown'}, type=${body?.type || 'unknown'}`);
    return this.runlayerService.execute(body);
  }
}
