import { Module } from '@nestjs/common';
import { MarathonsModule } from '../marathons/marathons.module';
import { SupportChatController } from './support-chat.controller';
import { SupportChatService } from './support-chat.service';

@Module({
  imports: [MarathonsModule],
  controllers: [SupportChatController],
  providers: [SupportChatService],
})
export class SupportChatModule {}
