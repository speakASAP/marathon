import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarathonsModule } from './marathons/marathons.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { WinnersModule } from './winners/winners.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AnswersModule } from './answers/answers.module';
import { StepsModule } from './steps/steps.module';
import { MeModule } from './me/me.module';
import { PaymentsModule } from './payments/payments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { RunlayerModule } from './runlayer/runlayer.module';
import { SupportChatModule } from './support-chat/support-chat.module';
import { RequestContextMiddleware } from './shared/request-context.middleware';
import { NotificationsService } from './shared/notifications.service';
import { PrismaService } from './shared/prisma.service';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api', '/health', '/info', '/winners', '/winners/(.*)'],
    }),
    MarathonsModule,
    RegistrationsModule,
    WinnersModule,
    ReviewsModule,
    AnswersModule,
    StepsModule,
    MeModule,
    PaymentsModule,
    SubmissionsModule,
    RunlayerModule,
    SupportChatModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, NotificationsService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
