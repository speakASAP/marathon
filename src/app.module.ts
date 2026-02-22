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
import { RequestContextMiddleware } from './shared/request-context.middleware';
import { NotificationsService } from './shared/notifications.service';
import { PrismaService } from './shared/prisma.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api', '/health', '/info'],
    }),
    MarathonsModule,
    RegistrationsModule,
    WinnersModule,
    ReviewsModule,
    AnswersModule,
    StepsModule,
    MeModule,
  ],
  controllers: [AppController],
  providers: [AppService, NotificationsService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
