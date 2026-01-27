import { Controller, Get, Logger, Req } from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService, Review } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  private readonly logger = new Logger(ReviewsController.name);

  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@Req() req?: Request): Review[] {
    this.logger.log('Reviews list request received');
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      query: req?.query,
      ip: req?.ip,
    })}`);

    try {
      const reviews = this.reviewsService.list();
      this.logger.log(`Reviews list response: count=${reviews.length}`);
      return reviews;
    } catch (error) {
      this.logger.error(
        `Reviews list failed: error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
