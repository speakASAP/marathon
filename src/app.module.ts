import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarathonsModule } from './marathons/marathons.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { WinnersModule } from './winners/winners.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AnswersModule } from './answers/answers.module';
import { MeModule } from './me/me.module';
import { RequestContextMiddleware } from './shared/request-context.middleware';
import { NotificationsService } from './shared/notifications.service';
import { PrismaService } from './shared/prisma.service';

@Module({
  imports: [MarathonsModule, RegistrationsModule, WinnersModule, ReviewsModule, AnswersModule, MeModule],
  controllers: [AppController],
  providers: [AppService, NotificationsService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
