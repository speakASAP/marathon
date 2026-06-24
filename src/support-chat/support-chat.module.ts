import { Module } from '@nestjs/common';
import { MarathonsModule } from '../marathons/marathons.module';
import { StepsModule } from '../steps/steps.module';
import { MarathonKnowledgeService } from './marathon-knowledge.service';
import { SupportChatController } from './support-chat.controller';
import { SupportChatService } from './support-chat.service';

@Module({
  imports: [MarathonsModule, StepsModule],
  controllers: [SupportChatController],
  providers: [MarathonKnowledgeService, SupportChatService],
})
export class SupportChatModule {}
