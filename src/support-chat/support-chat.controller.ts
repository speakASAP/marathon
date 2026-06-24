import { Body, Controller, Logger, Post } from '@nestjs/common';
import { SupportChatService, SupportChatResponse } from './support-chat.service';

type SupportChatRequest = {
  message?: unknown;
};

@Controller('support/chat')
export class SupportChatController {
  private readonly logger = new Logger(SupportChatController.name);

  constructor(private readonly supportChatService: SupportChatService) {}

  @Post()
  async ask(@Body() body: SupportChatRequest): Promise<SupportChatResponse> {
    const message = typeof body?.message === 'string' ? body.message : '';
    this.logger.log(`Support chat request received: length=${message.length}`);
    return this.supportChatService.answer(message);
  }
}
