import { Controller, Get, Logger, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ReviewsPaginated, ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  private readonly logger = new Logger(ReviewsController.name);

  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ): Promise<ReviewsPaginated> {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? parseInt(limit, 10) || 24 : 24;

    this.logger.log('Reviews list request received');
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      query: req?.query,
      ip: req?.ip,
    })}`);

    try {
      const reviews = await this.reviewsService.list(pageNum, limitNum);
      this.logger.log(
        `Reviews list response: total=${reviews.total}, items=${reviews.items.length}, page=${reviews.page}`,
      );
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
